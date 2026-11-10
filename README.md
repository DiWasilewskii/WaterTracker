# WaterTracker

Аква-Тамагочі — улюбленець, який живе, поки ви п'єте достатньо води.
Веб-версія (`index.html`) і застосунок Android (`android/`), що загортає її в WebView.

## Збирання APK

```
powershell -ExecutionPolicy Bypass -File android\build-apk.ps1
```

Результат: `dist\AquaTamagotchi.apk`. Перший запуск завантажує JDK і Android build-tools
(~310 МБ) у `%LOCALAPPDATA%\WaterTrackerAndroidTools`.

> Ключ підпису — `android/release.keystore` (не в git). Збережіть його окремо:
> без нього нові версії не встановляться поверх старих.

## Випуск нової версії

Застосунок сам перевіряє [GitHub Releases](https://github.com/DiWasilewskii/WaterTracker/releases)
(раз на 6 год, а також кнопкою «Перевірити оновлення» в налаштуваннях) і пропонує оновитися.

1. Збільште `VersionName` і `VersionCode` на початку `android/build-apk.ps1`
   (наприклад `1.3` і `4`) та зберіть APK.
2. Закомітьте й запуште зміни.
3. На GitHub: **Releases → Draft a new release**
   - тег: `v` + VersionName, наприклад `v1.3`;
   - у полі опису — що нового (показується користувачам у вікні оновлення);
   - прикріпіть `dist\AquaTamagotchi.apk`;
   - **Publish release**.

Застосунок порівнює номер із тегу зі своєю версією, тож тег має бути більшим за поточну версію.
