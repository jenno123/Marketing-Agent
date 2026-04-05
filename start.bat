@echo off
title Hjerlhede Marketing Agent
cd /d "%~dp0"

echo Tjekker Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Python ikke fundet. Downloader og installerer Python...
    curl -o python_installer.exe https://www.python.org/ftp/python/3.12.9/python-3.12.9-amd64.exe
    echo Installerer Python - dette tager et øjeblik...
    python_installer.exe /quiet InstallAllUsers=1 PrependPath=1 Include_test=0
    del python_installer.exe
    echo Python installeret!
    echo Genstart venligst programmet ved at dobbeltklikke på start.bat igen.
    pause
    exit
)

echo Python fundet. Starter appen...

if not exist venv (
    echo Opsætter environment for første gang...
    python -m venv venv
    call venv\Scripts\activate
    pip install streamlit anthropic requests beautifulsoup4 python-dotenv --quiet
    echo Opsætning færdig!
) else (
    call venv\Scripts\activate
)

echo Starter Hjerlhede Marketing Agent...
streamlit run app.py
pause