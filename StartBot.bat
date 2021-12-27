@echo on
SETLOCAL ENABLEDELAYEDEXPANSION
echo starting bot 

:inizio

cd C:\Users\Matteo\Desktop\WhatsAppBot EasyTax\
node bot.js
echo restarting bot
EVENTCREATE /T ERROR /L APPLICATION /ID 100 /D "Restarting bot."
timeout 10 /nobreak
goto inizio
ENDLOCAL
pause
cls