$path = "d:\EatFitAI_v1\eatfitai-prep-web\src\views\DatasetPipeline.tsx"
$content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
$targetStart = 'le={{ fontSize'
$indexOfStart = $content.IndexOf($targetStart)
if ($indexOfStart -gt 0) {
    $indexOfTaxonomy = $content.IndexOf('Taxonomy Simulator')
    if ($indexOfTaxonomy -gt $indexOfStart) {
        $indexOfEnd = $content.LastIndexOf('{', $indexOfTaxonomy)
        if ($indexOfEnd -gt $indexOfStart) {
            $leftSide = $content.Substring(0, $indexOfStart)
            $rightSide = $content.Substring($indexOfEnd)
            $newContent = $leftSide + "`r`n`r`n        " + $rightSide
            [System.IO.File]::WriteAllText($path, $newContent, [System.Text.Encoding]::UTF8)
            Write-Output "Dọn rác thành công!"
        } else {
            Write-Output "Không tìm thấy dấu ngoặc mở trước Taxonomy!"
        }
    } else {
        Write-Output "Không tìm thấy Taxonomy Simulator sau rác!"
    }
} else {
    Write-Output "Không tìm thấy điểm bắt đầu rác!"
}
