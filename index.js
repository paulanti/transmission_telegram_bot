'use strict';

const TelegramBot = require('node-telegram-bot-api');
const Transmission = require('transmission');
const { defaultMaxListeners } = require('node-telegram-bot-api');
const downloadDirectories = process.env.DOWNLOAD_DIRS;

const transmission = new Transmission({
  host: process.env.TRANSMISSION_HOST,
  port: process.env.TRANSMISSION_PORT,
  username: process.env.TRANSMISSION_USERNAME,
  password: process.env.TRANSMISSION_PASSWORD
});

const token = process.env.TOKEN;

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {polling: true});
var path;

bot.on('document', async (msg) => {
  const chatId = msg.chat.id;
  let fileId = msg.document.file_id;
  path = await bot.downloadFile(fileId, "./torrents");

  bot.sendMessage(msg.chat.id, "*Choose path*", {
    "parse_mode": "MarkdownV2",
    "reply_markup": {
        "keyboard": [downloadDirectories.split(','), ["Show downloading torrents stats"]],
        "one_time_keyboard": true
      }
  });
});

bot.onText(/\/mnt\/hdd\/([^]+)/, (msg, match) => {
  const downloadPath = match[0];
  const chatId = msg.chat.id;
  
  transmission.addFile(path, {"download-dir": downloadPath}, (err, result) => {
    if (err) return console.log(err);
    let id = result.id;
    bot.sendMessage(chatId, `Torrent with id *${id}* has been added`, {"parse_mode": "Markdown"});

    const sendTorrentDownloadedMessage = () => bot.sendMessage(chatId, `Torrent with id *${id}* has been downloaded`, {"parse_mode": "Markdown"});

    transmission.waitForState(id, 'SEED_WAIT', () => {
      sendTorrentDownloadedMessage();
    });

    transmission.waitForState(id, 'SEED', () => {
      sendTorrentDownloadedMessage();
    });
  });
});

bot.onText(/Show downloading torrents stats/, (msg, match) => {
  const chatId = msg.chat.id;
  transmission.active((err, result) => {
    if (err) {
      console.log(err);
    } else {
      result.torrents.forEach(element => {
        if (element.status === transmission.status.DOWNLOAD) {
          let name = element.name;
          let percentage = (element.percentDone * 100).toFixed(1);
          let totalSize = (element.totalSize / 1000000000).toFixed(2);
          let downloadedSize = (element.percentDone * totalSize).toFixed(2);
          let downloadRate = (element.rateDownload / 1000000).toFixed(2);
          let progress = Math.floor(percentage / 10);
          let text = `*${name}*
          *${percentage}*%|${'█'.repeat(progress)}${' '.repeat(10 - progress)}| ${downloadedSize}GB/${totalSize}GB [[${downloadRate}MB/s]]`;
          bot.sendMessage(chatId, text, {"parse_mode": "Markdown"})
        };
      });
    }
  })
});