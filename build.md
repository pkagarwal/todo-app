# Build and Setup Guide

This document provides explicit instructions for setting up, compiling, testing, and packaging this Python application locally.

## Prerequisites

Before continuing, verify that your local environment has the following software installed:

- **Python**: `^3.11`
- **Dependency Manager**: `pip` (included with Python) and `virtualenv`

---

## 1. Local Environment Configuration

To prevent system-level package conflicts, isolate project dependencies using a Python virtual environment.

### Step A: Initialize the Virtual Environment
```bash
# Create a virtual environment named '.venv'
python3 -m venv .venv
```

### Step B: Activate the Virtual Environment
```bash
# On Linux and macOS:
source .venv/bin/activate

# On Windows (Command Prompt):
.venv\Scripts\activate.bat

# On Windows (PowerShell):
.venv\Scripts\Activate.ps1
```

### Step C: Provision Dependencies
Ensure `pip` is up to date, then install the project workspace requirements:
```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

---

## 2. Environment Variables

Configure your local runtime environments by creating a local configuration file:

```bash
cp .env.example .env
```
*Open `.env` and fill in your local credentials and API keys before running the application.*

---

## 3. Local Execution and Development

To run the application locally inside your activated environment:

```bash
python -m src.main
```

---

## 4. Automated Testing and Code Quality

Run the following test suites to ensure build integrity before pushing your changes:

### Execute Unit Tests
```bash
# Run tests with pytest
pytest tests/
```

### Code Formatting and Linting
```bash
# Check code style with Black
black --check src/

# Lint code with Flake8
flake8 src/
```

---

## 5. Compiling and Packaging (Production Build)

If you need to compile code or package the project into a distributable archive (Wheel or Source Distribution):

### Step A: Install Build Requirements
```bash
pip install --upgrade build
```

### Step B: Build Distributable Packages
```bash
python -m build
```

The resulting optimized `.whl` and `.tar.gz` archive artifacts will be generated inside the `./dist` directory.
