# Edge AI Tuning Kit
This document provides comprehensive details about the software and its supported functionalities.

## Validated Models

This document provides an overview of the AI models that have been tested and confirmed to work with the Edge AI Tuning Kit. It includes compatibility tables that indicate which models support specific training methods such as LoRA and QLoRA across different Intel hardware configurations. This section helps users quickly identify which models and training approaches are supported, ensuring efficient and successful model fine-tuning on their chosen hardware.

> **⚠️ Known Issue:**
> DeepSeek models may report low accuracy metrics after training. This is expected behavior and will not affect the actual performance or quality of model outputs.


<details open>
<summary><strong>LoRA Training Support:</strong></summary>

The table below shows which models support LoRA (Low-Rank Adaptation) training across different Intel hardware configurations. LoRA training allows for efficient fine-tuning of large language models with minimal memory overhead.

| Model Family | Model | A770 Single | A770 Multi | B580 Single | B580 Multi |
|:-------------|:------|:-----------:|:----------:|:-----------:|:----------:|
| **Llama** | Llama-3.2-1B-Instruct | ✅ | ✅ | ✅ | ✅ |
|  | Llama-3.2-3B-Instruct | ✅ | ✅ | ✅ | ✅ |
| **Qwen** | Qwen2.5-0.5B-Instruct | ✅ | ✅ | ✅ | ✅ |
|  | Qwen2.5-1.5B-Instruct | ✅ | ✅ | ✅ | ✅ |
|  | Qwen2.5-3B-Instruct | ✅ | ✅ | ❌ | ✅ |
| **DeepSeek** | DeepSeek-R1-Distill-Qwen-1.5B | ✅ | ✅ | ❌ | ✅ |

</details>

---

<details open>
<summary><strong>QLoRA Training Support:</strong></summary>

QLoRA (Quantized Low-Rank Adaptation) extends LoRA by using quantization to further reduce memory requirements, enabling fine-tuning of even larger models on consumer hardware. The compatibility matrix below shows which models can be trained with QLoRA on different Intel GPUs.

| Model Family | Model | A770 | B580 |
|:-------------|:------|:----:|:----:|
| **Llama** | Llama-3.1-8B-Instruct | ✅ | ✅ |
|  | Llama-3.2-1B-Instruct | ✅ | ✅ |
|  | Llama-3.2-3B-Instruct | ✅ | ✅ |
| **Qwen** | Qwen2.5-0.5B-Instruct | ✅ | ✅ |
|  | Qwen2.5-1.5B-Instruct | ✅ | ✅ |
|  | Qwen2.5-3B-Instruct | ✅ | ✅ |
|  | Qwen2.5-7B-Instruct | ✅ | ❌ |
| **DeepSeek** | DeepSeek-R1-Distill-Llama-8B | ✅ | ✅ |
|  | DeepSeek-R1-Distill-Qwen-1.5B | ✅ | ✅ |
|  | DeepSeek-R1-Distill-Qwen-7B | ✅ | ✅ |
| **Mistral** | Mistral-7B-Instruct-v0.3 | ✅ | ✅ |

**Note:** QLoRA training is available on single GPU configurations only. Multi-GPU training is not supported for QLoRA.

</details>

## Training Parameters Guide
This document presents the key training parameters for training a Large-Language Model (LLM), along with their default values and descriptions. These parameters play a crucial role in controlling the training process, affecting factors such as computational memory efficiency, training speed, and model accuracy. The table covers important parameters like training batch size, evaluation batch size, learning rate, learning rate scheduler type, gradient accumulation steps, number of training epochs, and optimizer algorithms. Understanding and tuning these parameters appropriately can significantly impact the model's training time and final performance.

| Parameter | Default | Description |
| --- | --- | --- |
| Training Batch Size | 2 | The number of samples processed in one forward/backward pass during training. Increasing the batch size can speed up training but may require more memory. Decreasing the batch size can help with limited memory but may slow down training. |
| Evaluation Batch Size | 1 | The number of samples processed in one forward pass during evaluation or inference. A larger batch size can speed up evaluation but may require more memory. |
| Gradient Accumulation Steps | 1 | The number of batches to accumulate gradients before performing an optimizer step. Increasing this value can simulate a larger batch size, allowing training with larger effective batch sizes with limited memory. |
| Model Learning Rate | 1e-4 | The step size at each iteration for updating the model weights during training. A higher learning rate can lead to shorter training time but may have lower accuracy, while a lower learning rate can lead to longer training time but higher accuracy. |
| Learning Rate Scheduler Type | cosine | The type of learning rate scheduler used to adjust the learning rate during training. Common options include "cosine" and "linear". The cosine LR schedule follows a cosine pattern, where the learning rate is gradually decreased from the initial value to a minimum value and then increased again towards the end of training. The linear LR schedule linearly decreases the learning rate from an initial value to a final value over the course of the training process at a constant rate with each epoch.|
| Number of Training Epochs | 3 | The number of complete passes through the entire training dataset during training. More epochs generally lead to better performance but may also overfit the model to the training data. |
| Optimizer | AdamW | The optimization algorithm used to update the model weights during training. Common options include "AdamW". AdamW is a variant of the Adam optimization algorithm that combines adaptive learning rates and momentum with L2 regularization (weight decay) to prevent overfitting and improve generalization performance. |