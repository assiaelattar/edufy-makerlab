$cert = New-SelfSignedCertificate -Type Custom -Subject "CN=SparkQuestDev" -KeyUsage DigitalSignature -FriendlyName "SparkQuestDev" -CertStoreLocation "Cert:\CurrentUser\My" -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3", "2.5.29.19={text}")
$pwd = ConvertTo-SecureString -String "password" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath "cert.pfx" -Password $pwd
Write-Host "Certificate created: cert.pfx"
