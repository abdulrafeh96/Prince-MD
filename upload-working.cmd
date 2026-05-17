@echo off
REM upload-working.cmd
REM Usage: upload-working.cmd [commit message]

SETLOCAL ENABLEDELAYEDEXPANSION
SET REPO_URL=https://github.com/abdulrafeh96/Prince-MD.git
SET COMMIT_MESSAGE=%~1
IF "%COMMIT_MESSAGE%"=="" SET COMMIT_MESSAGE=Upload bot

PUSHD "%~dp0"

where git >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
  echo ERROR: Git is not installed or not available in PATH.
  GOTO :END
)

git rev-parse --is-inside-work-tree >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
  echo Initializing new git repository...
  git init >nul 2>&1
) ELSE (
  echo Git repository detected.
)

FOR /F "usebackq tokens=*" %%A IN (`git remote get-url origin 2^>nul`) DO SET REMOTE_URL=%%A
IF "%REMOTE_URL%"=="" (
  echo Adding remote origin: %REPO_URL%
  git remote add origin %REPO_URL%
) ELSE IF NOT "%REMOTE_URL%"=="%REPO_URL%" (
  echo Updating origin remote URL to: %REPO_URL%
  git remote set-url origin %REPO_URL%
) ELSE (
  echo Remote origin already set to %REPO_URL%
)

echo Staging all files...
git add .
IF %ERRORLEVEL% NEQ 0 (
  echo ERROR: Failed to stage files.
  GOTO :END
)

echo Committing changes: %COMMIT_MESSAGE%
git commit -m "%COMMIT_MESSAGE%" >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
  echo No changes to commit or commit failed. Continuing to push existing history.
)

FOR /F "usebackq tokens=*" %%A IN (`git branch --show-current 2^>nul`) DO SET CURRENT_BRANCH=%%A
IF "%CURRENT_BRANCH%"=="" SET CURRENT_BRANCH=HEAD

SET TARGET_BRANCH=main
echo Attempting to push current branch to origin/%TARGET_BRANCH%...
git push -u origin HEAD:%TARGET_BRANCH%
IF %ERRORLEVEL% EQU 0 (
  echo Upload complete! Pushed to origin/%TARGET_BRANCH%.
  GOTO :END
)

echo Push to origin/%TARGET_BRANCH% failed. Trying fallback branch...
SET FallbackBranch=upload-%DATE:~10,4%%DATE:~4,2%%DATE:~7,2%%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%
REM Remove possible spaces from time
SET FallbackBranch=%FallbackBranch: =0%

git push -u origin HEAD:%FallbackBranch%
IF %ERRORLEVEL% EQU 0 (
  echo Upload complete! Pushed to origin/%FallbackBranch%.
  GOTO :END
)

echo ERROR: Git push failed. Check authentication, remote URL, and repository rules.

:END
POPD
ENDLOCAL