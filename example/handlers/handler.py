def handler(event, context):
    if not hasattr(context, "iopipe") or not hasattr(context.iopipe, "mark"):
        raise Error("No plugins")

    return 200
