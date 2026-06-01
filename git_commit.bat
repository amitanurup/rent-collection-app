@echo off
set GIT="C:\Users\amita\AppData\Local\GitHubDesktop\app-3.5.12\resources\app\git\cmd\git.exe"
if exist .git\index.lock del .git\index.lock
%GIT% add .
%GIT% commit -m "Initial commit"
