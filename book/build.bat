@echo off
if not exist build mkdir build

:: Set PYTHONPATH to include settings folder for sitecustomize.py
set PYTHONPATH=%~dp0tex\styles;%PYTHONPATH%

:: Update build version
python tex/styles/update_version.py

:: Run compilation from tex directory but output to root build folder.
:: minted v3 needs TEXMF_OUTPUT_DIRECTORY when -output-directory is used;
:: three passes settle the table of contents and the bibliography (biber).
cd tex
set TEXMF_OUTPUT_DIRECTORY=../build
xelatex -shell-escape -interaction=nonstopmode -output-directory=../build main.tex
biber --input-directory=../build --output-directory=../build main
xelatex -shell-escape -interaction=nonstopmode -output-directory=../build main.tex
xelatex -shell-escape -interaction=nonstopmode -output-directory=../build main.tex
cd ..

:: Clean up root directory (just in case)
del tex\*.aux tex\*.log tex\*.out tex\*.toc tex\*.synctex.gz tex\*.xdv tex\*.minted 2>nul

echo Build complete. PDF is in build/main.pdf
