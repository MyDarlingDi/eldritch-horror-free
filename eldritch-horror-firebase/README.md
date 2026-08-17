# Eldritch Horror — бесплатная общая комната

Сайт публикуется бесплатно на GitHub Pages. Firebase Spark бесплатно хранит и синхронизирует комнаты. Банковская карта не требуется.

## 1. Создать Firebase

1. Откройте https://console.firebase.google.com/ и нажмите **Создать проект**.
2. Google Analytics можно отключить.
3. Откройте **Build → Authentication → Get started → Sign-in method**.
4. Включите **Anonymous / Анонимный** вход и сохраните.
5. Откройте **Build → Realtime Database → Create database**.
6. Выберите ближайший доступный регион и **Start in locked mode**.
7. Во вкладке **Rules** замените текст содержимым файла `database.rules.json` и нажмите **Publish**.

## 2. Получить три значения

1. В Firebase откройте шестерёнку → **Project settings → General**.
2. В разделе **Your apps** нажмите значок `</>` и зарегистрируйте веб-приложение. Firebase Hosting включать не нужно.
3. Из показанного блока скопируйте `apiKey` и `projectId`.
4. `databaseURL` скопируйте со страницы **Realtime Database**. Он выглядит примерно так: `https://название-default-rtdb.europe-west1.firebasedatabase.app`.
5. Откройте файл `firebase-config.js` и замените три строки-заглушки своими значениями.

## 3. Опубликовать на GitHub Pages

1. Создайте на GitHub новый публичный репозиторий, например `eldritch-horror-free`.
2. Нажмите **Add file → Upload files**.
3. Загрузите **содержимое этой папки**, чтобы `index.html` находился прямо в корне репозитория.
4. Откройте **Settings → Pages**.
5. В разделе **Build and deployment** выберите **Deploy from a branch**, ветку **main**, папку **/(root)** и нажмите **Save**.
6. Через несколько минут GitHub покажет адрес вида `https://mydarlingdi.github.io/eldritch-horror-free/`.

## 4. Проверить

1. Откройте адрес на первом телефоне, нажмите **Общая комната → Создать комнату**.
2. Откройте тот же адрес на втором телефоне, нажмите **Войти по коду**.
3. На первом телефоне измените здоровье сыщика. Через пару секунд изменение должно появиться на втором.

Если кнопка сообщает, что Firebase не подключена, проверьте `firebase-config.js`. Если Firebase отвечает `PERMISSION_DENIED`, проверьте, включён ли анонимный вход и опубликованы ли правила из `database.rules.json`.
