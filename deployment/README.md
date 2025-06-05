# LLM Deployment Toolkit
The Deployment Toolkit is a sophisticated Language Model (LLM) application designed to leverage the power of Intel CPUs and GPUs. It features Retrieval Augmented Generation (RAG), a cutting-edge technology that enhances the model's ability to generate accurate and contextually relevant responses by integrating external information retrieval mechanisms.

![LLM On Edge](./assets/ui.gif)

## Requirements
### Validated hardware
* CPU: 13th generations of Intel Core processors and above
* GPU: Intel® Arc™ graphics
* RAM: 32GB
* DISK: 128GB

### Application ports
Please ensure that you have these ports available before running the applications.
| Apps    | Port |
|---------|------|
| UI      | 8010 |
| Backend | 8011 |
| Serving | 8012 |

## Quick Start
### 1. Install operating system
Install the latest [Ubuntu* 22.04 LTS Desktop](https://releases.ubuntu.com/jammy/). Refer to [Ubuntu Desktop installation tutorial](https://ubuntu.com/tutorials/install-ubuntu-desktop#1-overview) if needed.

### 2. Install GPU driver (Optional)
If you plan to use GPU to perform inference, please install the GPU driver according to your GPU version.
* Intel® Arc™ A-Series Graphics: [link](https://github.com/intel/edge-developer-kit-reference-scripts/tree/main/gpu/arc/dg2)
* Intel® Data Center GPU Flex Series: [link](https://github.com/intel/edge-developer-kit-reference-scripts/tree/main/gpu/flex/ats)

### 3. Install the application
This step will download all the dependencies needed to run the application.
```bash
./install.sh
```

### 4. Start all the services
Run the script to start all the services. During the first time running, the script will download some assets required to run the services, please ensure you have internet connection.
```bash
./run.sh
```

## FAQ
### Uninstall the app
```bash
./uninstall.sh
```

### Utilize NPU in AI PC
The Speech to Text model inference can be offloaded on the NPU device on an AI PC. Edit the `ENCODER_DEVICE` to *NPU* in `backend/config.yaml` to run the encoder model on NPU. *Currently only encoder model is supported to run on NPU device*
```
# Example:
STT:
  MODEL_ID: base
  ENCODER_DEVICE: NPU # <- Edit this line to NPU
  DECODER_DEVICE: CPU
```

### Environmental variables
You can change the port of the backend server api to route to specific OpenAI compatible server running as well as the serving port.
| Environmental variable |       Default Value      |
|------------------------|--------------------------|
| OPENAI_BASE_URL        | http://localhost:8012/v1 |
| SERVER_HOST            |          0.0.0.0         |
| SERVER_PORT            |           8011           |

## Limitations
1. Current speech-to-text feature only work with localhost.
2. RAG documents will use all the documents that are uploaded.
