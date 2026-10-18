// Download the complete script before executing it; preserve installer arguments and exit status.
const MAC_INSTALL_COMMAND = "pofis=$(curl -fsSL https://pofis.app/install.sh) && /bin/bash -c \"$pofis\" --";

module.exports = { MAC_INSTALL_COMMAND };
