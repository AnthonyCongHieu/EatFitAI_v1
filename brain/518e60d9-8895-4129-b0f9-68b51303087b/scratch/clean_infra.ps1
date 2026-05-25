$file = "d:/EatFitAI_v1/eatfitai-prep-web/src/views/Infrastructure.tsx"
$content = Get-Content $file
# Dòng 1 đến 312 giữ nguyên (index 0 đến 311)
# Dòng 350 đến cuối giữ nguyên (index 349 đến cuối)
$newContent = $content[0..311] + $content[349..($content.Length-1)]
$newContent | Set-Content $file -Encoding utf8
Write-Host "Infrastructure.tsx cleaned successfully!"
