; BulkListingPro Native Host Installer
; Inno Setup Script
; https://jrsoftware.org/isinfo.php

#define MyAppName "BulkListingPro"
#define MyAppVersion "0.1.0"
#define MyAppPublisher "BulkListingPro"
#define MyAppURL "https://github.com/smythmyke/BulkListingPro"
#define MyAppExeName "Launch Chrome.bat"

[Setup]
; App identity
AppId={{B8C5E8A2-7D3F-4A1E-9C6B-2F8D4E5A3B1C}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}/issues
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
; Output settings
OutputDir=..\dist
OutputBaseFilename=BulkListingPro-Setup-v{#MyAppVersion}
; Compression
Compression=lzma
SolidCompression=yes
; Privileges - user level install (no admin needed for HKCU registry)
PrivilegesRequired=lowest
; Modern look
WizardStyle=modern
; License (optional - uncomment if you have one)
; LicenseFile=..\LICENSE.txt

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
; Native host files
Source: "..\native-host\host.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\native-host\host.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\native-host\package.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\native-host\package-lock.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\native-host\src\*"; DestDir: "{app}\src"; Flags: ignoreversion recursesubdirs
Source: "..\native-host\config\*"; DestDir: "{app}\config"; Flags: ignoreversion recursesubdirs
; Pre-installed node_modules (we'll create this)
Source: "..\native-host\node_modules\*"; DestDir: "{app}\node_modules"; Flags: ignoreversion recursesubdirs; Check: DirExists(ExpandConstant('{#SourcePath}\..\native-host\node_modules'))
; Batch files
Source: "Launch Chrome.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "LaunchChrome.vbs"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
; Desktop shortcut
Name: "{autodesktop}\Chrome (BulkListingPro)"; Filename: "{app}\LaunchChrome.vbs"; IconFilename: "{app}\LaunchChrome.vbs"; Comment: "Launch Chrome with BulkListingPro support"
; Start Menu
Name: "{group}\Chrome (BulkListingPro)"; Filename: "{app}\LaunchChrome.vbs"
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"

[Registry]
; Register native messaging host
Root: HKCU; Subkey: "Software\Google\Chrome\NativeMessagingHosts\com.bulklistingpro.host"; ValueType: string; ValueData: "{app}\com.bulklistingpro.host.json"; Flags: uninsdeletekey

[Run]
; Install npm dependencies after install (if node_modules not bundled)
Filename: "cmd.exe"; Parameters: "/c npm install --production"; WorkingDir: "{app}"; StatusMsg: "Installing dependencies..."; Flags: runhidden; Check: not DirExists(ExpandConstant('{app}\node_modules'))
; Open extension page after install
Filename: "cmd.exe"; Parameters: "/c start https://github.com/smythmyke/BulkListingPro#installation"; Description: "View installation instructions"; Flags: postinstall shellexec skipifsilent nowait

[Code]
var
  NodeJSPage: TInputOptionWizardPage;
  NodeJSInstalled: Boolean;

// Check if Node.js is installed
function IsNodeJSInstalled: Boolean;
var
  ResultCode: Integer;
begin
  Result := Exec('cmd.exe', '/c node --version', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Result := Result and (ResultCode = 0);
end;

// Initialize wizard
procedure InitializeWizard;
begin
  NodeJSInstalled := IsNodeJSInstalled;

  if not NodeJSInstalled then
  begin
    NodeJSPage := CreateInputOptionPage(wpWelcome,
      'Node.js Required',
      'BulkListingPro requires Node.js to run.',
      'Node.js was not detected on your system. Please install it before continuing:',
      True, False);
    NodeJSPage.Add('I will install Node.js from https://nodejs.org/ (LTS version recommended)');
    NodeJSPage.Add('Node.js is already installed (check again)');
    NodeJSPage.Values[0] := True;
  end;
end;

// Handle Node.js page
function NextButtonClick(CurPageID: Integer): Boolean;
var
  ResultCode: Integer;
begin
  Result := True;

  if not NodeJSInstalled and (CurPageID = NodeJSPage.ID) then
  begin
    if NodeJSPage.Values[0] then
    begin
      // Open Node.js download page
      ShellExec('open', 'https://nodejs.org/', '', '', SW_SHOW, ewNoWait, ResultCode);
      MsgBox('Please install Node.js and then click OK to continue.', mbInformation, MB_OK);
    end;

    // Re-check if Node.js is now installed
    if not IsNodeJSInstalled then
    begin
      if MsgBox('Node.js is still not detected. Continue anyway?', mbConfirmation, MB_YESNO) = IDNO then
        Result := False;
    end;
  end;
end;

// Create the native messaging manifest after install
procedure CurStepChanged(CurStep: TSetupStep);
var
  ManifestPath: String;
  ManifestContent: String;
  AppPath: String;
begin
  if CurStep = ssPostInstall then
  begin
    AppPath := ExpandConstant('{app}');
    ManifestPath := AppPath + '\com.bulklistingpro.host.json';

    // Create manifest with correct path (escape backslashes for JSON)
    StringChangeEx(AppPath, '\', '\\', True);

    ManifestContent := '{' + #13#10 +
      '  "name": "com.bulklistingpro.host",' + #13#10 +
      '  "description": "BulkListingPro Native Host for Etsy automation",' + #13#10 +
      '  "path": "' + AppPath + '\\host.bat",' + #13#10 +
      '  "type": "stdio",' + #13#10 +
      '  "allowed_origins": [' + #13#10 +
      '    "chrome-extension://fejjolabponaaklodpnlgikkolkckpjl/"' + #13#10 +
      '  ]' + #13#10 +
      '}';

    SaveStringToFile(ManifestPath, ManifestContent, False);
  end;
end;
