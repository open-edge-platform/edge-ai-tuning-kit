# Edge AI Tuning Kit
The Edge AI Tuning Kit is a comprehensive solution for creating, tailoring, and implementing AI models in any location. It incorporates training and inference frameworks, safeguarding toolkits, data management tools, and pre-existing models. This provides businesses with a convenient, economical, and rapid approach to integrate AI on the Intel Platform.

## Requirements
### Hardware Requirements
Training Node:
| Hardware requirements | Minimum                                             | Recommended                                        |
|-----------------------|-----------------------------------------------------|----------------------------------------------------|
| CPU                   | 13th Gen Intel(R) Core CPU and above                | 4th Gen Intel® Xeon® Scalable Processor and above  |
| GPU                   | Intel® Arc™ A770 Graphics (16GB)                    | Multiple Intel® Arc™ A770 Graphics (16GB)          |
| RAM (GB)              | 64 and above                                        | 128 and above                                      |
| Disk (GB)             | 500 (Around 4 projects with 1 training task each)   | 1000 (Around 8 projects with 1 training task each) |

### Software Requirements
* Ubuntu 22.04 LTS / Ubuntu 24.04 LTS
* Docker with **non-root user**.
* Intel GPU drivers

### More In Depth Information
Comprehensive documentation regarding supported models and additional technical specifications is available in the [documentation](docs/SOFTWARE.md)

## Quick Start Guide
### 1. Create a Hugging Face account and generate an access token. For more information, please refer to [link](https://huggingface.co/docs/hub/en/security-tokens).

### 2. Login to your Hugging Face account and browse to [mistralai/Mistral-7B-Instruct-v0.3](https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.3) and click on the `Agree and access repository` button.

### 3. Setup GPU driver based on your GPU version
* Intel® Arc™ A-Series Graphics: [link](https://github.com/intel/edge-developer-kit-reference-scripts/tree/main/gpu/arc/dg2)
* Intel® Data Center GPU Flex Series: [link](https://github.com/intel/edge-developer-kit-reference-scripts/tree/main/gpu/flex/ats)

### 4. Install Docker
Follow the docker installation using the [link](https://docs.docker.com/engine/install/ubuntu/)

### 5. Set permissions for the Docker group
Run the following command to add your current user to the Docker group. After running the command, log out and log back in for the changes to take effect.
```
sudo usermod -aG docker $USER
```

### 6. Setup the application
Run the setup using the command below.
```bash
./setup.sh -b
```

### 7. Run the application
Browse to http://localhost after the application started successfully.
```bash
./setup.sh -r
```

## FAQs
### Running on a Specific Network Interface

To change the network interface the application listens on, edit the `HOST` value in the `.env` file located in the application directory.  
For example, to listen on all available interfaces, set:

```
HOST=0.0.0.0
```

By default, the application is listen only on localhost

```
HOST=127.0.0.1
```

### Stop the application
Run the command below to stop the application.
```bash
./setup.sh -s
```

### Remove the data files
If you want to remove the database & application cache files, run the following command:
```bash
# Remove the database cache file
docker volume rm edge-ai-tuning-kit-data-cache
docker volume rm edge-ai-tuning-kit-database 
docker volume rm edge-ai-tuning-kit-task-cache
```

### Enable Memory Overcommit on Redis
If user see this issue when running the docker compose up on redis container, user will need to enable memory overcommit.
```
# WARNING Memory overcommit must be enabled! Without it, a background save or replication may fail under low memory condition. Being disabled, it can also cause failures without low memory condition, see https://github.com/jemalloc/jemalloc/issues/1328. To fix this issue add 'vm.overcommit_memory = 1' to /etc/sysctl.conf and then reboot or run the command 'sysctl vm.overcommit_memory=1' for this to take effect.
```

## Limitations
1. Only support instruction-based models or tokenizers with a chat template.

## Disclaimer
The software provided are designed to run exclusively in a trusted environment on a single machine, and they are not intended for deployment on production servers. These scripts have been validated and tested for use in controlled, secure settings. Running the software in any other environment, especially on production systems, is not supported and may result in unexpected behavior, security risks, or performance issues.
