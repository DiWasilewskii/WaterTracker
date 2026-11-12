# WaterTracker

Крапелька (англ. Krapelka) — улюбленець, який живе, поки ви п'єте достатньо води.
Веб-версія (`index.html`) і застосунок Android (`android/`), що загортає її в WebView.

## Збирання APK

```
powershell -ExecutionPolicy Bypass -File android\build-apk.ps1
```

Результат: `dist\Krapelka.apk`. Перший запуск завантажує JDK і Android build-tools
(~310 МБ) у `%LOCALAPPDATA%\WaterTrackerAndroidTools`.

> Ключ підпису — `android/release.keystore` (не в git). Збережіть його окремо:
> без нього нові версії не встановляться поверх старих.

## Оновлення гри (непомітно, без APK)

Зміни у файлах гри (`index.html`, `css/`, `js/`, картинки) доходять до телефонів самі:
застосунок у фоні завантажує їх із гілки `main` на GitHub, перевіряє SHA-256
і застосовує при наступному відкритті (або після повернення в застосунок через 5+ хв).
Прогрес гри зберігається.

1. Змініть файли гри.
2. Виконайте `powershell -ExecutionPolicy Bypass -File web-release.ps1` —
   він оновить `web-version.json` і збільшить номер версії гри.
3. Закомітьте й запуште в `main`. Усе.

Новий файл гри треба додати до списку в `web-release.ps1`.
Якщо гра починає використовувати нові нативні функції `AndroidBridge`, запустіть
`web-release.ps1 -MinNativeCode <versionCode>` — тоді старі APK не отримають несумісну версію.

## Випуск нового APK

Потрібен лише для змін у нативному коді (`android/`). Застосунок сам перевіряє [GitHub Releases](https://github.com/DiWasilewskii/WaterTracker/releases)
(раз на 6 год, а також кнопкою «Перевірити оновлення» в налаштуваннях) і пропонує оновитися.

1. Збільште `VersionName` і `VersionCode` на початку `android/build-apk.ps1`
   (наприклад `1.5` і `7`) та зберіть APK.
2. Закомітьте й запуште зміни.
3. На GitHub: **Releases → Draft a new release**
   - тег: `v` + VersionName, наприклад `v1.5`;
   - у полі опису — що нового (показується користувачам у вікні оновлення);
   - прикріпіть `dist\Krapelka.apk`;
   - **Publish release**.

Застосунок порівнює номер із тегу зі своєю версією, тож тег має бути більшим за поточну версію.
