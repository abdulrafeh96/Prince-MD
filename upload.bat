@echo off
REM Upload the current Git repo to the remote origin main branch.
REM Usage: upload.bat "commit message"

SETLOCAL ENABLEDELAYEDEXPANSION
SET commitMessage=%~1
IF "%commitMessage%"=="" SET commitMessage=Upload bot

echo Adding all files...
git add .
if errorlevel 1 (
  echo Failed to add files.
  exit /b 1
)
echo Committing with message: "%commitMessage%"
git commit -m "%commitMessage%"
if errorlevel 1 (
  echo Commit failed. Maybe nothing to commit.
)
echo Pushing to origin main...
git push origin main
if errorlevel 1 (
  echo Push failed. Check your git remote and authentication.
  exit /b 1
)
echo Upload complete.
ENDLOCAL