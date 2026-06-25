@echo off
echo 🚀 Initializing Git and pushing to GitHub...

cd /d "c:\Users\barad\Downloads\GitaGpt"

echo 📁 Current directory: %cd%

echo 🔧 Initializing git repository...
git init

echo 📝 Creating .gitignore...
echo node_modules/ > .gitignore
echo __pycache__/ >> .gitignore
echo *.pyc >> .gitignore
echo .env >> .gitignore
echo .vscode/ >> .gitignore
echo dist/ >> .gitignore
echo build/ >> .gitignore
echo .DS_Store >> .gitignore
echo Thumbs.db >> .gitignore
echo *.log >> .gitignore

echo ➕ Adding all files...
git add .

echo 💬 Creating initial commit...
git commit -m "Initial commit: GitaGPT - Bhagavad Gita AI chatbot with auth, speech recognition, and modern UI"

echo 🔗 Adding remote origin...
git remote add origin https://github.com/barad5036/GitaGpt.git

echo 🌿 Creating main branch...
git branch -M main

echo 📤 Pushing to GitHub...
git push -u origin main

echo ✅ Done! Project pushed to https://github.com/barad5036/GitaGpt.git

pause