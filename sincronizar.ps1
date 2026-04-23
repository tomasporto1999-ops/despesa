$url = "https://script.google.com/macros/s/AKfycbyB0OvYotmaaIv4zmARFieMcu3vv1nSJWkQe1eo3KYLqQ7YKA-uSBAgdPS4zvOHePhb/exec"
$destino = Join-Path $PSScriptRoot "despesas_local.csv"

$resposta = Invoke-WebRequest -Uri $url -Method GET -UseBasicParsing
$dados = $resposta.Content | ConvertFrom-Json

if ($dados.status -eq "ok" -and $dados.rows.Count -gt 0) {
    $cabecalhos = $dados.rows[0].PSObject.Properties.Name
    $linhas = New-Object System.Collections.Generic.List[string]
    $linhas.Add(($cabecalhos -join ";"))
    foreach ($row in $dados.rows) {
        $valores = $cabecalhos | ForEach-Object { $row.$_ }
        $linhas.Add(($valores -join ";"))
    }
    [System.IO.File]::WriteAllLines($destino, $linhas, [System.Text.Encoding]::UTF8)
    Write-Host "Sincronizado: $($dados.rows.Count) despesas -> despesas_local.csv"
} else {
    Write-Host "Sem dados."
}
