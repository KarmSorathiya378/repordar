Get-CimInstance Win32_Process -Filter "Name='python.exe'" |
    Where-Object { $_.CommandLine -like '*crawler*' } |
    ForEach-Object { Write-Output ("pid=" + $_.ProcessId + " :: " + $_.CommandLine) }