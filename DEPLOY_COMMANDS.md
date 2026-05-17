# Prince Md VPS Deployment Commands

Ye commands Ubuntu/Debian VPS ke liye hain. Project ka folder name `EDDY_BOT` rakha gaya hai.

## 1. Server Update

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential ffmpeg
```

## 2. Node.js 20 Install

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

## 3. PM2 Install

```bash
sudo npm install -g pm2
pm2 -v
```

## 4. Bot Upload / Clone

GitHub se clone karna ho:

```bash
cd ~
git clone YOUR_REPO_URL EDDY_BOT
cd EDDY_BOT
```

Zip upload ki ho to:

```bash
cd ~
unzip EDDY_BOT.zip -d EDDY_BOT
cd EDDY_BOT
```

## 5. Config Set Karna

```bash
nano config/config.js
```

Is file me apna `ownerNumber`, Telegram token, prefix, port, aur WhatsApp login method check kar lo.

## 6. Dependencies Install

```bash
npm install --legacy-peer-deps
```

## 7. Syntax Check

```bash
node --check index.js
node --check commands/gdrive.js
node --check handlers/groupHandler.js
node --check utils/autoScheduler.js
```

## 8. First Run For Pairing

```bash
npm start
```

Pairing code/QR complete ho jaye to `CTRL + C` se stop karo.

## 9. PM2 Start

```bash
npm run pm2:start
pm2 save
pm2 startup
```

`pm2 startup` jo command print kare, usko copy karke run karo. Phir:

```bash
pm2 save
```

## 10. Daily Commands

Status:

```bash
pm2 status
```

Logs:

```bash
npm run pm2:logs
```

Restart:

```bash
npm run pm2:restart
```

Stop:

```bash
npm run pm2:stop
```

Update code:

```bash
cd ~/EDDY_BOT
git pull
npm install --legacy-peer-deps
npm run pm2:restart
```

## 11. Backup Important Folders

```bash
tar -czf eddy-backup-$(date +%F).tar.gz sessions secrets database autogroup-schedules.json
```

Restore:

```bash
tar -xzf eddy-backup-YYYY-MM-DD.tar.gz
```

## 12. Firewall Optional

```bash
sudo ufw allow OpenSSH
sudo ufw allow 3000/tcp
sudo ufw enable
```

## Notes

- `sessions/` delete na karna, warna WhatsApp dobara pair karna padega.
- VPS restart ke baad PM2 bot auto start karega.
- Agar QR/pairing issue aaye to `pm2 logs eddy-bot` se error dekho.
