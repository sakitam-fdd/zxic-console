@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
cls

set "SCRIPT_DIR=%~dp0"
set "WEB_DIR=%SCRIPT_DIR%web"
set "BACKUP_DIR=%SCRIPT_DIR%web_backup"
set "DEVICE_WEB=/etc_ro/web"
set "SUPPORTED_HW=F231ZC_V1.0_OM_OM"
set "WAIT_SECONDS=0"

if not exist "%WEB_DIR%\index.html" (
    echo [错误] 未找到 "%WEB_DIR%\index.html"。
    echo 请将压缩包完整解压后，从压缩包根目录运行本脚本。
    goto FAIL
)

adb version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 ADB，请安装 Android Platform Tools 并加入 PATH。
    goto FAIL
)
curl --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 curl，请安装 curl 并加入 PATH。
    goto FAIL
)
powershell -NoProfile -Command "exit 0" >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 PowerShell，无法执行安全的本地空间计算。
    goto FAIL
)

echo ============================================================
echo                 ZXIC Console 一键安装
 echo ============================================================
echo 支持硬件：%SUPPORTED_HW%
echo.
echo 刷写前请确认：
echo   1. 设备已开机，USB 已连接，后台密码为 admin。
echo   2. 电脑只连接这一台 ADB 设备，状态必须为 device。
echo   3. 刷写期间不要断电、拔线、关闭窗口或登录设备后台。
echo   4. 已准备好备份空间；脚本会把原后台保存为 web_backup。
echo.
set /p "DEVICE_IP=请输入设备 IP 地址: "
if not defined DEVICE_IP (
    echo [错误] IP 地址不能为空。
    goto FAIL
)

set "SET_URL=http://%DEVICE_IP%/goform/goform_set_cmd_process"
set "GET_URL=http://%DEVICE_IP%/goform/goform_get_cmd_process"
set "HTTP_RES="

echo.
echo [1/10] 正在登录设备后台...
for /f "delims=" %%A in ('curl --fail-with-body -m 5 -s -X POST -H "Content-Type: application/x-www-form-urlencoded; charset=UTF-8" -d "goformId=LOGIN^&password=YWRtaW4=" "%SET_URL%" 2^>nul') do set "HTTP_RES=%%A"
if not defined HTTP_RES (
    echo [错误] 登录请求失败或设备无响应。
    goto FAIL
)
powershell -NoProfile -Command "$j = ConvertFrom-Json $args[0]; if ($j.result -ne '0') { exit 1 }" "!HTTP_RES!" >nul 2>&1
if errorlevel 1 (
    echo [错误] 登录失败，请确认设备 IP 和后台密码是否为 admin。
    goto FAIL
)

echo [2/10] 正在校验硬件版本...
set "HTTP_RES="
for /f "delims=" %%A in ('curl --fail-with-body -m 5 -s -G --data-urlencode "cmd=hw_version" "%GET_URL%" 2^>nul') do set "HTTP_RES=%%A"
if not defined HTTP_RES (
    echo [错误] 无法读取硬件版本。
    goto FAIL
)
echo !HTTP_RES!| findstr /r /c:"{\"hw_version\":\"%SUPPORTED_HW%\"}" >nul
if errorlevel 1 (
    echo [错误] 设备硬件版本不受支持。
    echo 期望：%SUPPORTED_HW%
    echo 返回：!HTTP_RES!
    goto FAIL
)

echo [3/10] 正在开启 ADB 调试模式...
set "HTTP_RES="
for /f "delims=" %%A in ('curl --fail-with-body -m 10 -s -G --data-urlencode "goformId=SET_DEVICE_MODE" --data-urlencode "debug_enable=2" "%SET_URL%" 2^>nul') do set "HTTP_RES=%%A"
if errorlevel 1 (
    echo [错误] 开启 ADB 调试模式请求失败。
    goto ENABLE_ERROR
)
timeout /t 2 >nul
set "HTTP_RES="
for /f "delims=" %%A in ('curl --fail-with-body -m 10 -s -G --data-urlencode "goformId=SET_DEVICE_MODE" --data-urlencode "debug_enable=1" "%SET_URL%" 2^>nul') do set "HTTP_RES=%%A"
if not defined HTTP_RES goto ENABLE_ERROR
echo !HTTP_RES!| findstr /c:"set_devicemode successfully" >nul
if errorlevel 1 goto ENABLE_ERROR

echo [4/10] 正在重启设备...
curl --fail-with-body -m 5 -s -G --data-urlencode "goformId=REBOOT_DEVICE" "%SET_URL%" >nul 2>&1
if errorlevel 1 (
    echo [错误] 重启请求失败。
    goto ENABLE_ERROR
)

echo 正在等待设备网络恢复（最多 90 秒）...
set /a WAIT_SECONDS=0
:WAIT_NETWORK
ping -n 1 -w 1000 "%DEVICE_IP%" >nul 2>&1
if not errorlevel 1 goto NETWORK_READY
set /a WAIT_SECONDS+=1
if !WAIT_SECONDS! GEQ 90 (
    echo [错误] 等待设备网络恢复超时。
    goto FAIL
)
timeout /t 1 >nul
goto WAIT_NETWORK

:NETWORK_READY
echo [5/10] 正在等待唯一的 ADB 设备上线...
set /a WAIT_SECONDS=0
:WAIT_ADB
set /a DEVICE_COUNT=0
set "ADB_SERIAL="
for /f "skip=1 tokens=1,2" %%A in ('adb devices 2^>nul') do if "%%B" == "device" (
    set /a DEVICE_COUNT+=1
    set "ADB_SERIAL=%%A"
)
if "!DEVICE_COUNT!" == "1" goto ADB_READY
set /a WAIT_SECONDS+=1
if !WAIT_SECONDS! GEQ 90 (
    echo [错误] 未能在 90 秒内检测到唯一的 ADB device。
    echo 当前 device 数量：!DEVICE_COUNT!
    echo 请拔出其他设备并确认 USB 调试已开启。
    goto FAIL
)
timeout /t 1 >nul
goto WAIT_ADB

:ADB_READY
set "ADB_TARGET=adb -s !ADB_SERIAL!"
for /f "delims=" %%A in ('!ADB_TARGET! shell echo connected 2^>nul') do set "ADB_OUTPUT=%%A"
if not "!ADB_OUTPUT!" == "connected" (
    echo [错误] ADB 连接测试失败。
    goto FAIL
)

echo [6/10] 正在检查设备 Web 目录...
!ADB_TARGET! shell ls "%DEVICE_WEB%/index.html" >nul 2>&1
if errorlevel 1 (
    echo [错误] 设备不存在 %DEVICE_WEB%/index.html，已停止刷写。
    goto FAIL
)

if exist "%BACKUP_DIR%" (
    echo [错误] 已存在 "%BACKUP_DIR%"。
    echo 请先将旧备份移到安全位置后再运行，脚本不会覆盖备份。
    goto FAIL
)

echo [7/10] 正在备份原 Web 后台...
!ADB_TARGET! pull "%DEVICE_WEB%" "%BACKUP_DIR%" >nul
if errorlevel 1 (
    echo [错误] 原 Web 后台备份失败。
    goto FAIL
)
if not exist "%BACKUP_DIR%\index.html" (
    echo [错误] 备份目录缺少 index.html，已停止刷写。
    goto FAIL
)
echo 原后台已备份到：%BACKUP_DIR%

echo [8/10] 正在检查空间...
set "AVAILABLE_KB="
for /f "skip=1 tokens=4" %%A in ('!ADB_TARGET! shell df -k "%DEVICE_WEB%" 2^>nul') do if not defined AVAILABLE_KB set "AVAILABLE_KB=%%A"
if not defined AVAILABLE_KB (
    echo [错误] 无法读取设备剩余空间。
    goto FAIL
)
for /f "delims=" %%A in ('powershell -NoProfile -Command "if ('%AVAILABLE_KB%' -notmatch '^[0-9]+$') { exit 1 }"') do set "SPACE_VALID=%%A"
!ADB_TARGET! shell du -k -s "%DEVICE_WEB%" > "%TEMP%\zxic-web-size.txt" 2>nul
if errorlevel 1 goto FAIL
set "OLD_WEB_KB="
for /f "tokens=1" %%A in (%TEMP%\zxic-web-size.txt) do if not defined OLD_WEB_KB set "OLD_WEB_KB=%%A"
if not defined OLD_WEB_KB (
    echo [错误] 无法读取设备原 Web 大小。
    goto FAIL
)
set "NEW_BYTES="
for /f "delims=" %%A in ('powershell -NoProfile -Command "(Get-ChildItem -LiteralPath '%WEB_DIR%' -Recurse -File | Measure-Object -Property Length -Sum).Sum"') do set "NEW_BYTES=%%A"
if not defined NEW_BYTES set "NEW_BYTES=0"
for /f "delims=" %%A in ('powershell -NoProfile -Command "[math]::Ceiling([double](!NEW_BYTES!)/1024)"') do set "NEW_KB=%%A"
set /a AVAILABLE_KB_NUM=AVAILABLE_KB
set /a OLD_WEB_KB_NUM=OLD_WEB_KB
set /a NEW_KB_NUM=NEW_KB
set /a PROJECTED_KB=AVAILABLE_KB_NUM+OLD_WEB_KB_NUM
if !PROJECTED_KB! LSS !NEW_KB_NUM! (
    echo [错误] 设备空间不足。
    echo 可用空间：!AVAILABLE_KB_NUM! KB，原 Web：!OLD_WEB_KB_NUM! KB，新 Web：!NEW_KB_NUM! KB。
    del /q "%TEMP%\zxic-web-size.txt" >nul 2>&1
    goto FAIL
)
echo 可用空间：!AVAILABLE_KB_NUM! KB + 原 Web：!OLD_WEB_KB_NUM! KB >= 新 Web：!NEW_KB_NUM! KB，空间检查通过。
del /q "%TEMP%\zxic-web-size.txt" >nul 2>&1

!ADB_TARGET! shell mount -o rw,remount /
if errorlevel 1 (
    echo [错误] 设备根目录重新挂载为可写失败。
    goto FAIL
)
!ADB_TARGET! shell touch "%DEVICE_WEB%/.zxic_write_test" >nul 2>&1
if errorlevel 1 (
    echo [错误] 设备 Web 目录不可写。
    goto FAIL
)
!ADB_TARGET! shell ls "%DEVICE_WEB%/.zxic_write_test" >nul 2>&1
if errorlevel 1 (
    echo [错误] 写入测试文件校验失败。
    goto FAIL
)
!ADB_TARGET! shell rm -f "%DEVICE_WEB%/.zxic_write_test" >nul 2>&1

echo.
echo 即将删除设备原 Web 目录并刷入新版本。
echo 原目录备份：%BACKUP_DIR%
echo 请确认设备保持连接且不要执行其他操作。
set /p "CONFIRM=确认刷入请输入大写 Y，其他输入取消: "
if not "!CONFIRM!" == "Y" (
    echo 已取消刷入，原 Web 未被修改。
    goto END
)

echo [9/10] 正在替换设备 Web 后台...
!ADB_TARGET! shell rm -rf "%DEVICE_WEB%"
if errorlevel 1 goto RECOVER
!ADB_TARGET! push "%WEB_DIR%" "%DEVICE_WEB%" >nul
if errorlevel 1 goto RECOVER

!ADB_TARGET! shell ls "%DEVICE_WEB%/index.html" >nul 2>&1
if errorlevel 1 goto RECOVER

echo [10/10] 新 Web 后台验证成功。
echo 新后台地址：http://%DEVICE_IP%
set /p "DISABLE=请输入大写 Y 关闭设备 ADB，其他输入保持开启: "
if "!DISABLE!" == "Y" (
    set "HTTP_RES="
    for /f "delims=" %%A in ('curl --fail-with-body -m 10 -s -G --data-urlencode "goformId=SET_DEVICE_MODE" --data-urlencode "debug_enable=0" "%SET_URL%" 2^>nul') do set "HTTP_RES=%%A"
    echo !HTTP_RES!| findstr /c:"set_devicemode successfully" >nul
    if errorlevel 1 echo [警告] 关闭 ADB 请求未确认成功。
    curl --fail-with-body -m 5 -s -G --data-urlencode "goformId=REBOOT_DEVICE" "%SET_URL%" >nul 2>&1
)
echo 安装完成。
goto END

:RECOVER
echo [严重错误] 新 Web 刷入或验证失败，正在恢复原后台...
!ADB_TARGET! shell rm -rf "%DEVICE_WEB%" >nul 2>&1
!ADB_TARGET! push "%BACKUP_DIR%\." "%DEVICE_WEB%" >nul 2>&1
if errorlevel 1 goto RECOVER_FAILED
!ADB_TARGET! shell ls "%DEVICE_WEB%/index.html" >nul 2>&1
if errorlevel 1 goto RECOVER_FAILED
echo 原 Web 后台已恢复，请不要重启设备，先确认设备状态。
goto FAIL

:RECOVER_FAILED
echo [严重错误] 自动恢复失败。
echo 请勿重启设备，保留以下备份并寻求 ADB 协助：%BACKUP_DIR%
goto FAIL

:ENABLE_ERROR
set "HTTP_RES="
for /f "delims=" %%A in ('curl --fail-with-body -m 10 -s -G --data-urlencode "goformId=SET_DEVICE_MODE" --data-urlencode "debug_enable=0" "%SET_URL%" 2^>nul') do set "HTTP_RES=%%A"
curl --fail-with-body -m 5 -s -G --data-urlencode "goformId=REBOOT_DEVICE" "%SET_URL%" >nul 2>&1
echo [错误] 开启 ADB 失败，已尝试关闭调试模式并重启设备。

goto FAIL

:FAIL
echo.
echo 安装未完成，原 Web 目录未主动删除（若已发生刷写失败则请查看恢复结果）。
:END
endlocal
pause
