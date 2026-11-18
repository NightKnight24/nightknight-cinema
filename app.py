import os
import sys
import shutil


def main():
    os.environ.setdefault("PORT", os.environ.get("GRADIO_SERVER_PORT", "7860"))
    os.environ.setdefault("HOST", "0.0.0.0")
    server_js = os.path.join(os.path.dirname(os.path.abspath(__file__)), "server.js")

    # 1. Prefer nodejs-wheel (installed via requirements.txt on Hugging Face Gradio Spaces)
    try:
        from nodejs_wheel import node
        sys.exit(node([server_js]))
    except ImportError:
        pass

    # 2. Fallback to system node binary
    node_bin = shutil.which("node")
    if node_bin:
        os.execv(node_bin, [node_bin, server_js])

    raise RuntimeError("Node.js runtime not found. Ensure nodejs-wheel is in requirements.txt.")


if __name__ == "__main__":
    main()
