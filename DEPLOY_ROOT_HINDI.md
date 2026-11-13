# Deploy (repo root se)

## Railway
Ab root me `Dockerfile` + `railway.json` hai -> Root Directory set karne ki zarurat nahi, seedha Redeploy.
Settings > Networking > "Generate Domain" dabao (BASE_URL auto detect hoga).

## Heroku
```
heroku create APP_NAME
heroku labs:enable runtime-dyno-metadata -a APP_NAME
heroku config:set BASE_URL=https://APP_NAME.herokuapp.com WEB_SECRET=$(openssl rand -hex 16) -a APP_NAME
git push heroku main
heroku ps:scale web=1 -a APP_NAME
```
Baaki sab variables `telegram-bot/config.py` ke defaults se aate hain.
Heroku ki disk temporary hoti hai -> `MONGODB_URI` zaroor set karo.
