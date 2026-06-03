import requests

OFFICE_BASE_URL = "http://127.0.0.1:19000"


def update_workflow(
    global_status=None,
    current_stage=None,
    progress=None,
    cat_id=None,
    cat_status=None,
    summary=None,
    details=None,
    logs=None,
    task=None,
    result_summary=None,
    report=None,
    error=None,
):
    payload = {}

    if global_status is not None:
        payload["global_status"] = global_status
    if current_stage is not None:
        payload["current_stage"] = current_stage
    if progress is not None:
        payload["progress"] = progress
    if cat_id is not None:
        payload["cat_id"] = cat_id
    if cat_status is not None:
        payload["cat_status"] = cat_status
    if summary is not None:
        payload["summary"] = summary
    if details is not None:
        payload["details"] = details
    if logs is not None:
        payload["logs"] = logs
    if task is not None:
        payload["task"] = task
    if result_summary is not None:
        payload["result_summary"] = result_summary
    if report is not None:
        payload["report"] = report
    if error is not None:
        payload["error"] = error

    try:
        requests.post(
            f"{OFFICE_BASE_URL}/workflow/update",
            json=payload,
            timeout=2
        )
    except Exception:
        pass
