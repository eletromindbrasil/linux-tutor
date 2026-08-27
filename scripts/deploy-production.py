#!/usr/bin/env python3
"""Build and deploy Linux Tutor through the Eletromind Portainer API."""

from __future__ import annotations

import json
import os
import secrets
import struct
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent.parent
STACK_NAME = "linux-tutor"
PUBLIC_HEALTH_URL = "https://linux.eletrovps.com/api/health"


def required_environment(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"Variável obrigatória ausente: {name}")
    return value


PORTAINER_URL = required_environment("PORTAINER_URL").rstrip("/")
PORTAINER_API_KEY = required_environment("PORTAINER_API_KEY")
RELEASE_SHA = required_environment("GITHUB_SHA")
IMAGE_TAG = f"release-{RELEASE_SHA[:12]}"


def portainer_request(
    path: str,
    *,
    method: str = "GET",
    payload: dict | None = None,
    body: bytes | None = None,
    content_type: str = "application/json",
    timeout: int = 120,
):
    if payload is not None:
        body = json.dumps(payload).encode()
    request = urllib.request.Request(
        f"{PORTAINER_URL}{path}",
        data=body,
        method=method,
        headers={
            "X-API-Key": PORTAINER_API_KEY,
            "Content-Type": content_type,
        },
    )
    try:
        return urllib.request.urlopen(request, timeout=timeout)
    except urllib.error.HTTPError as error:
        detail = error.read().decode(errors="replace")[:1000]
        raise RuntimeError(f"Portainer respondeu HTTP {error.code}: {detail}") from error


def portainer_json(path: str, *, method: str = "GET", payload: dict | None = None):
    with portainer_request(path, method=method, payload=payload) as response:
        raw = response.read()
    return json.loads(raw) if raw else None


def find_stack() -> dict:
    stacks = portainer_json("/api/stacks")
    matches = [stack for stack in stacks if stack.get("Name") == STACK_NAME]
    if len(matches) != 1:
        raise RuntimeError(f"Esperava uma stack {STACK_NAME!r}; encontrei {len(matches)}")
    return portainer_json(f"/api/stacks/{matches[0]['Id']}")


def create_build_context() -> Path:
    descriptor, archive_name = tempfile.mkstemp(prefix="linux-tutor-", suffix=".tar")
    os.close(descriptor)
    archive = Path(archive_name)
    subprocess.run(
        ["git", "archive", "--format=tar", f"--output={archive}", RELEASE_SHA],
        cwd=PROJECT_ROOT,
        check=True,
    )
    return archive


def build_image(endpoint_id: int, archive: Path, image: str, dockerfile: str) -> None:
    query = urllib.parse.urlencode(
        {"t": image, "dockerfile": dockerfile, "rm": "1", "forcerm": "1"}
    )
    print(f"Construindo {image} com {dockerfile}...", flush=True)
    with archive.open("rb") as context:
        with portainer_request(
            f"/api/endpoints/{endpoint_id}/docker/build?{query}",
            method="POST",
            body=context.read(),
            content_type="application/x-tar",
            timeout=1200,
        ) as response:
            for raw_line in response:
                if not raw_line.strip():
                    continue
                event = json.loads(raw_line)
                if event.get("error"):
                    raise RuntimeError(event["error"])
                output = event.get("stream", "").rstrip()
                if output:
                    print(output, flush=True)


def current_environment(stack: dict) -> dict[str, str]:
    return {
        item.get("name", item.get("Name")): item.get("value", item.get("Value", ""))
        for item in (stack.get("Env") or [])
        if item.get("name", item.get("Name"))
    }


def stack_file(stack_id: int) -> str:
    data = portainer_json(f"/api/stacks/{stack_id}/file")
    return data["StackFileContent"]


def update_stack(stack_id: int, endpoint_id: int, content: str, environment: dict[str, str]) -> None:
    payload = {
        "StackFileContent": content,
        "Env": [{"name": name, "value": value} for name, value in environment.items()],
        "Prune": True,
        "PullImage": False,
    }
    portainer_json(
        f"/api/stacks/{stack_id}?endpointId={endpoint_id}",
        method="PUT",
        payload=payload,
    )


def wait_for_health(timeout_seconds: int = 180) -> None:
    deadline = time.monotonic() + timeout_seconds
    last_error = "sem resposta"
    while time.monotonic() < deadline:
        try:
            request = urllib.request.Request(
                PUBLIC_HEALTH_URL,
                headers={"User-Agent": "linux-tutor-deploy"},
            )
            with urllib.request.urlopen(request, timeout=10) as response:
                payload = json.load(response)
            if payload == {"ok": True, "docker": "ready", "database": "ready"}:
                print("Aplicação, Docker e PostgreSQL estão saudáveis.", flush=True)
                return
            last_error = json.dumps(payload)
        except Exception as error:
            last_error = str(error)
        time.sleep(3)
    raise RuntimeError(f"Saúde pública não confirmou o deploy: {last_error}")


def running_app_container(endpoint_id: int) -> str:
    filters = urllib.parse.quote(
        json.dumps({"label": ["com.docker.swarm.service.name=linux-tutor_app"]})
    )
    containers = portainer_json(
        f"/api/endpoints/{endpoint_id}/docker/containers/json?all=1&filters={filters}"
    )
    running = [container for container in containers if container.get("State") == "running"]
    if len(running) != 1:
        raise RuntimeError(f"Esperava um contêiner app em execução; encontrei {len(running)}")
    return running[0]["Id"]


def demultiplex_docker_output(data: bytes) -> str:
    output: list[bytes] = []
    offset = 0
    while offset + 8 <= len(data) and data[offset] in (0, 1, 2, 3):
        size = struct.unpack(">I", data[offset + 4 : offset + 8])[0]
        end = offset + 8 + size
        if end > len(data):
            break
        output.append(data[offset + 8 : end])
        offset = end
    return (b"".join(output) if output else data).decode(errors="replace")


def exec_in_container(endpoint_id: int, container_id: str, command: list[str]) -> None:
    created = portainer_json(
        f"/api/endpoints/{endpoint_id}/docker/containers/{container_id}/exec",
        method="POST",
        payload={
            "AttachStdout": True,
            "AttachStderr": True,
            "Cmd": command,
        },
    )
    exec_id = created["Id"]
    with portainer_request(
        f"/api/endpoints/{endpoint_id}/docker/exec/{exec_id}/start",
        method="POST",
        payload={"Detach": False, "Tty": False},
        timeout=900,
    ) as response:
        output = demultiplex_docker_output(response.read())
    if output.strip():
        print(output.rstrip(), flush=True)
    inspection = portainer_json(f"/api/endpoints/{endpoint_id}/docker/exec/{exec_id}/json")
    if inspection.get("ExitCode") != 0:
        raise RuntimeError(f"Comando de validação falhou: {' '.join(command)}")


def main() -> None:
    stack = find_stack()
    stack_id = int(stack["Id"])
    endpoint_id = int(stack["EndpointId"])
    previous_content = stack_file(stack_id)
    previous_environment = current_environment(stack)
    environment = dict(previous_environment)
    environment.update(
        {
            "IMAGE_TAG": IMAGE_TAG,
            "DB_PASSWORD": environment.get("DB_PASSWORD") or secrets.token_urlsafe(36),
            "INITIAL_ADMIN_EMAIL": "eletromind.brasil@gmail.com",
            "INITIAL_ADMIN_PASSWORD": "12345678",
        }
    )

    archive = create_build_context()
    try:
        build_image(endpoint_id, archive, f"linux-tutor-app:{IMAGE_TAG}", "Dockerfile")
        build_image(endpoint_id, archive, f"linux-tutor-sandbox:{IMAGE_TAG}", "Dockerfile.sandbox")
    finally:
        archive.unlink(missing_ok=True)

    production_content = (PROJECT_ROOT / "compose.production.yaml").read_text()
    updated = False
    try:
        print(f"Atualizando a stack {STACK_NAME} para {IMAGE_TAG}...", flush=True)
        update_stack(stack_id, endpoint_id, production_content, environment)
        updated = True
        wait_for_health()
        container_id = running_app_container(endpoint_id)
        exec_in_container(endpoint_id, container_id, ["npm", "run", "lessons:validate"])
        exec_in_container(endpoint_id, container_id, ["npm", "run", "smoke"])
    except Exception:
        if updated:
            print("A validação falhou; restaurando a definição anterior da stack...", file=sys.stderr)
            update_stack(stack_id, endpoint_id, previous_content, previous_environment)
        raise

    print(f"Deploy validado em https://linux.eletrovps.com ({IMAGE_TAG}).", flush=True)


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"Deploy falhou: {error}", file=sys.stderr)
        raise SystemExit(1)
