# No Best Harness, No Best Model

An interactive companion to **No Best Harness, No Best Model: Model × Harness Interaction in Compact MoE Coding Agents**, by Pawel Zarzycki.

**[Explore the website](https://pzarzycki.github.io/swe-bench-harness-model/)**

The website explores coding-agent outcomes, harness behaviour, and model–harness interactions in the study.

The [dataset is available on Hugging Face](https://huggingface.co/datasets/pzarzycki/swebenchlive-harness-compact-moe).
The arXiv paper is forthcoming.

## Run locally

Requires Node.js 24 and npm.

```sh
npm ci
npm run dev
```

Build and preview the static website:

```sh
npm run build
npm run preview
```

GitHub Actions builds the site and deploys `dist/` to GitHub Pages on pushes to `main`.
This repository is a generated website snapshot. Each publication replaces `main` with a single root commit.
