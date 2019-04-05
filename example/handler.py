def handler(event, context):
    if not hasattr(context, "iopipe"):
        raise Exception("No iopipe.")

    if not hasattr(context.iopipe, "mark"):
        raise Exception("No plugins")

    return 200
