**Getting started**
- Add environment variables to `.env` file. Example in `.env_example`.
- Build docker image and run container:
```bash
docker build . -t transmission_telegram_bot
docker run --name transmission_telegram_bot -d --env-file='.env' --restart=always transmission_telegram_bot
```