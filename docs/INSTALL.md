# ZXIC Console 设备安装说明

## 支持范围

当前安装脚本只支持硬件版本 `F231ZC_V1.0_OM_OM`。不匹配的固件、硬件或目录结构请勿继续刷入，否则可能导致设备 Web 后台不可用。

## 压缩包内容

- `web/`：生产环境 Web 后台文件。
- `install.bat`：Windows 一键安装脚本。
- `INSTALL.md`：本说明。
- `SHA256SUMS`：压缩包内文件校验值。

## 使用前准备

1. 使用 Windows，并安装 `adb` 和 `curl`，确保它们已加入系统 `PATH`。
2. 设备开机并通过 USB 连接电脑，后台管理密码必须是 `admin`。
3. 刷入期间不要断电、拔线、关闭脚本窗口或登录设备后台。
4. 关闭电脑上的其他 Android/ADB 设备，避免脚本连接错误设备。
5. 确认设备有足够空间，并准备好恢复原后台的时间。

## 校验资源

在 PowerShell 中进入压缩包目录后执行：

```powershell
Get-FileHash .\install.bat -Algorithm SHA256
Get-FileHash .\INSTALL.md -Algorithm SHA256
```

将结果与 `SHA256SUMS` 对比。生产 Web 文件的校验值也记录在该文件中。

## 安装步骤

1. 将整个压缩包解压到普通目录，不要直接在压缩包内运行脚本。
2. 双击 `install.bat`。
3. 输入设备 IP 地址，通常是设备后台地址。
4. 脚本会登录后台、校验硬件版本、开启 ADB 并重启设备。
5. 确认电脑上只有一台 ADB 状态为 `device` 的设备。
6. 脚本会把原后台备份到同目录的 `web_backup`，请妥善保管。
7. 确认刷入后，脚本将替换 `/etc_ro/web` 并验证 `index.html`。
8. 成功后可选择关闭设备 ADB；不关闭也可以在设备后台的高级设置中关闭。

## 失败与恢复

刷入新文件或验证失败时，脚本会尝试使用 `web_backup` 自动恢复。如果自动恢复失败：

- 不要重启设备；
- 保持 USB/ADB 连接；
- 保留 `web_backup` 目录并寻求熟悉 ADB 的人员协助恢复到 `/etc_ro/web`。

刷入前请先确认备份成功。即使脚本包含恢复逻辑，也不能保证所有第三方固件都能恢复。

## 手动部署

仅适用于熟悉 ADB 的用户：

```sh
adb pull /etc_ro/web ./web_backup
adb shell mount -o rw,remount /
adb shell rm -rf /etc_ro/web
adb push ./web /etc_ro/web
adb shell reboot
```

任何手动操作前都应保留原始备份。不同固件可能存在 CGI 字段差异，首次使用应逐项验证写操作。
