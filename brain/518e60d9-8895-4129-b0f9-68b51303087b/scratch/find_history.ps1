$logPath = "C:\Users\PC\.gemini\antigravity\brain\8bdaaee1-14d8-4334-a954-3e48fc1d4682\.system_generated\logs\transcript.jsonl"
if (Test-Path $logPath) {
    # Đọc log và tìm các dòng chứa "Infrastructure.tsx" và "write_to_file"
    $lines = Get-Content $logPath
    $foundCode = $null
    
    # Duyệt ngược từ cuối log lên đầu để lấy phiên bản write_to_file mới nhất
    for ($i = $lines.Length - 1; $i -ge 0; $i--) {
        $line = $lines[$i]
        if ($line -like "*Infrastructure.tsx*" -and $line -like "*write_to_file*") {
            try {
                $json = ConvertFrom-Json $line
                # Duyệt qua các tool_calls trong step
                if ($json.tool_calls) {
                    foreach ($tc in $json.tool_calls) {
                        if ($tc.name -eq "write_to_file" -and $tc.arguments) {
                            # Convert arguments nếu nó là string JSON
                            $args = $tc.arguments
                            if ($args -is [string]) {
                                $args = ConvertFrom-Json $args
                            }
                            if ($args.TargetFile -like "*Infrastructure.tsx*" -and $args.CodeContent) {
                                $foundCode = $args.CodeContent
                                break
                            }
                        }
                    }
                }
            } catch {
                # Bỏ qua lỗi parse của dòng này và tiếp tục tìm dòng khác
            }
        }
        if ($foundCode) { break }
    }
    
    if ($foundCode) {
        $foundCode | Set-Content "C:\Users\PC\.gemini\antigravity\brain\518e60d9-8895-4129-b0f9-68b51303087b/scratch/recovered_infra.tsx" -Encoding utf8
        Write-Host "Infrastructure.tsx recovered successfully!"
    } else {
        Write-Host "Failed to find any write_to_file for Infrastructure.tsx in previous logs."
    }
} else {
    Write-Host "Previous log not found."
}
