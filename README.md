# RHEL VMs Extension

The RHEL VMs extension helps the user run RHEL Virtual machines.

## VM manager

The **RHEL VMs** dashboard shows VM counts and actions for Macadam VMs owned by this extension.
The **Virtual Machines** page provides a searchable table.
The existing Resources view remains available.

- The table shows status, provider, CPUs, memory, and disk size.
- Each VM name opens its summary page.
- Start, stop, and delete actions use the existing RHEL lifecycle.
- The Terminal tab provides an SSH shell with resize and reconnect controls.
- The Logs tab shows output from actions in this page during the current extension session.

### Create and manage a VM

1. Open **RHEL VMs** in the sidebar.
2. Select **Create VM**.
3. Complete the existing RHEL creation form.
4. Open **Virtual Machines** from the extension dashboard.
5. Select the VM name to open its details.
6. If the VM is stopped, select **Start** before terminal access.

The creation form retains image downloads, cached images, local images, and Red Hat registration.
Older Podman Desktop versions open Resources instead of the creation form.

### Safety and limits

Stop the VM before deletion. Macadam deletion removes the VM and its managed disk.

The terminal uses the existing Macadam SSH identity.
The webview never receives private key contents.
The guest must expose SSH for terminal access.
Terminal errors appear with a reconnect control.

The manager does not install or upgrade Macadam during list refresh.
Explicit VM actions retain the existing installer behavior.
The manager uses the extension's Macadam namespace, not unrelated Macadam VMs.
VMs remain under Macadam control after the webview closes.
Operation logs are not guest system logs and do not persist across extension restarts.

### Development layout

The extension backend remains in `src/`.
The Svelte webview is in `packages/frontend/`.
The RPC contract is in `packages/shared/`.
The frontend builds to `media/`, which the Containerfile includes in the extension image.
The dashboard and VM details follow the bootc layout.
SSH and logs share a local adapter of Podman Desktop's `TerminalWindow` component.
The `@podman-desktop/ui-svelte` package does not export this component.

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck:backend
pnpm typecheck:frontend
pnpm test
pnpm lint:check
```

`pnpm test` runs the backend and frontend tests.
`pnpm typecheck` checks both workspaces.

The existing Podman Desktop `--extension-folder` workflow uses the repository root.
`pnpm watch` rebuilds both the backend and frontend.

Build the extension image from the repository root:

```sh
podman build -f build/Containerfile -t rhel-vms:dev .
```

## Pre-requisites

### On Windows/WSL/x86_64

The `macadam` binary is embedded in the extension, nothing needs to be installed.

### On Mac/arm64

When initialized, the extension checks if the necessary binaries are present in `/opt/macadam/bin`. Several scenarios can happen:
- the binary is present and its version is the one expected by the extension (or a later version): the monitoring of VMs starts, and if VMs exist, they are listed in the Settings > RHEL VMs.
- no binary is present: the monitoring of the VMs is not started, and even if VMs exist, they are not listed in Settings > RHEL VMs. The binary will be installed the first time the user creates a new VM, and the monitoring of VMs will be started at this moment,
- the binary is present and its version is a prior version than the one expected by the extension: the monitoring is started with the found binary, and if VMs exist, they are listed in Settings > RHEL VMs. The first time the user makes an action on a VM (start, stop, delete, create), the correct binary is installed.

> If this installation fails, you can run the installer manually, using the installer found at https://github.com/crc-org/macadam/releases/tag/v0.3.0. After this, you need to restart the extension which should find and use the binaries.

### On Fedora Linux/x86_64

The `macadam` binary must be installed in the directory `/usr/local/bin/`: download the binary from https://github.com/crc-org/macadam/releases/tag/v0.3.0, rename it `macadam` and make it executable.

```
curl -L -o macadam https://github.com/crc-org/macadam/releases/download/v0.3.0/macadam-linux-amd64
chmod 755 macadam
sudo mkdir -p /usr/local/bin/
sudo mv macadam /usr/local/bin/
```

The `gvproxy` binary must be installed with the command `dnf install gvisor-tap-vsock`.

> macadam needs gvproxy >= 0.8.3 to work. On recent versions of Fedora, the version installed by the `gvisor-tap-vsock` package is correct. You may need to install it differently in older Fedora releases.

## Install the extension

OCI Images to install the extensions are available at https://github.com/redhat-developer/podman-desktop-rhel-ext/pkgs/container/podman-desktop-rhel-ext.

The latest development image is ghcr.io/redhat-developer/podman-desktop-rhel-ext:next

## Air-gapped environment

By default, the RHEL extension downloads virtual machine images from the Red Hat Customer Portal, and caches these images in the user's disk. If the user cannot have access to this portal, you can place the images in a specific directory of the user's computer, and these images will be used.

Images for versions RHEL 9.6+ and 10.0+ are supported.

The images must be placed in the following directory, with the following names:

### On MacOS / Linux

RHEL 10 image:
```
$HOME/.local/share/containers/podman-desktop/extensions-storage/redhat.rhel-vms/images/rhel10.qcow2
```

RHEL 9 image:
```
$HOME/.local/share/containers/podman-desktop/extensions-storage/redhat.rhel-vms/images/rhel9.qcow2
```

### On Windows

RHEL 10 image:
```
$HOME/.local/share/containers/podman-desktop/extensions-storage/redhat.rhel-vms/images/rhel10.tar.gz
```

RHEL 9 image:
```
$HOME/.local/share/containers/podman-desktop/extensions-storage/redhat.rhel-vms/images/rhel9.tar.gz
```

## Troubleshooting

**MacOS**

If you encounter an error while creating or running a VM using this plugin, follow the
steps below to diagnose and resolve the issue.

### Check VM Provider

Make sure you're using the `applehv` or `vfkit` provider instead of `libkrun`, as `libkrun` is currently unsupported by this plugin.

To verify the provider in use:

```bash
cat $HOME/.config/containers/containers.conf
```

Look under the `[machine]` section for the active provider.

### Run `macadam` with Debug Logs

If you're still facing issues, run the `macadam` binary manually with debug logging enabled to get detailed output.

### Verify VM Resource

Check if the VM resource is already created:

```bash
/opt/macadam/bin/macadam list
```

Example output:

```json
[
    {
        "Name": "rhel-rhel",
        "Image": "/Users/prkumar/.local/share/containers/macadam/machine/applehv/rhel-rhel-applehv.raw",
        "Created": "2025-05-07T15:50:47.035136+05:30",
        "Running": false,
        "Starting": false,
        "LastUp": "2025-05-07T16:07:21.542744+05:30",
        "CPUs": 2,
        "Memory": "4294967296",
        "DiskSize": "21474836480",
        "Port": 50988,
        "RemoteUsername": "core",
        "IdentityPath": "/Users/prkumar/.local/share/containers/macadam/machine/machine",
        "VMType": "applehv"
    }
]
```

### Start VM with Debug Option

Run the following command to start the VM with debug logging:

```bash
/opt/macadam/bin/macadam start rhel-rhel --log-level debug
```

Example debug output (indicating a socket-related error):

```
DEBU[...] socket length for /.../macadam/rhel-rhel-gvproxy.sock is 79
DEBU[...] checking that "gvproxy" socket is ready
DEBU[...] writing configuration file "/.../rhel-rhel.json"
unable to connect to "gvproxy" socket at "/.../rhel-rhel-gvproxy.sock"
```

### Resolve Socket Issue and Retry

To resolve the above issue:

```bash
rm -fr /var/folders/k9/gh0qglps52xgjgttb2skh9mh0000gn/T/macadam/
/opt/macadam/bin/macadam start rhel-rhel --log-level debug
```

This should clear the temporary files and allow the VM to start successfully.

## Contributing

Want to help develop and contribute to the RHEL VMs extension?

You can use pnpm watch --extension-folder from the Podman Desktop directory to automatically rebuild and test the RHEL VMs extension:

Note: make sure you have the appropriate [pre-requisites](https://github.com/podman-desktop/podman-desktop/blob/main/CONTRIBUTING.md#prerequisites-prepare-your-environment) installed.

```
git clone https://github.com/podman-desktop/podman-desktop
git clone https://github.com/redhat-developer/podman-desktop-rhel-ext
cd podman-desktop-rhel-ext
pnpm install
pnpm build
cd ../podman-desktop
pnpm watch --extension-folder ../podman-desktop-rhel-ext
```
