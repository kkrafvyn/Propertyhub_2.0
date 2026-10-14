"""Install store credentials without logging secrets."""
import base64
import datetime
import os
import plistlib
import shutil
import subprocess
from pathlib import Path

release = Path(os.environ['APPLE_RELEASE_DIR'])
release.mkdir(parents=True, exist_ok=True)
key_id = os.environ['ASC_KEY_ID']
if not key_id.isalnum():
    raise ValueError('Invalid App Store Connect key ID')
key_dir = Path.home() / '.appstoreconnect/private_keys'
key_dir.mkdir(parents=True, exist_ok=True)
key_file = key_dir / f'AuthKey_{key_id}.p8'
key_file.write_text(os.environ['ASC_PRIVATE_KEY'])
key_file.chmod(0o600)
platform = os.environ['PLATFORM']
profile = release / ('workspace.mobileprovision' if platform == 'ios' else 'workspace.provisionprofile')
secret = 'IOS_WORKSPACE_PROFILE' if platform == 'ios' else 'MAC_WORKSPACE_PROFILE'
profile.write_bytes(base64.b64decode(os.environ[secret], validate=True))
profile.chmod(0o600)
p = plistlib.loads(subprocess.check_output(['security', 'cms', '-D', '-i', str(profile)]))
if p.get('TeamIdentifier') != ['7T2JK53K5M']:
    raise ValueError('Profile must belong to Prosper Ocloo / Infinitek team 7T2JK53K5M')
if p['ExpirationDate'] <= datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None):
    raise ValueError('Provisioning profile has expired')
entitlements = p['Entitlements']
app_id = entitlements.get('application-identifier', entitlements.get('com.apple.application-identifier'))
if app_id != '7T2JK53K5M.com.baymiftah.workspace':
    raise ValueError('Expected workspace App ID in provisioning profile')
if p.get('ProvisionedDevices') or p.get('ProvisionsAllDevices') or entitlements.get('get-task-allow'):
    raise ValueError('Use an App Store distribution profile')
if platform == 'ios':
    (release / 'distribution.p12').write_bytes(base64.b64decode(os.environ['IOS_DISTRIBUTION_P12'], validate=True))
    (release / 'profile-uuid').write_text(p['UUID'])
    for directory in ['Library/MobileDevice/Provisioning Profiles', 'Library/Developer/Xcode/UserData/Provisioning Profiles']:
        target = Path.home() / directory
        target.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(profile, target / (p['UUID'] + '.mobileprovision'))
    options = {
        'method': 'app-store-connect', 'destination': 'export',
        'signingStyle': 'manual', 'teamID': '7T2JK53K5M',
        'signingCertificate': 'Apple Distribution',
        'provisioningProfiles': {'com.baymiftah.workspace': p['UUID']},
        'manageAppVersionAndBuildNumber': False, 'uploadSymbols': True,
    }
    (release / 'ExportOptions.plist').write_bytes(plistlib.dumps(options))
print('Prepared App Store credentials for', platform)
