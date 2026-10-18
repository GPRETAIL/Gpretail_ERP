import { Box } from "@mui/material";
import vnLogo from "../../assets/vynerix-vn.svg";

export default function VynerixLogo({ sx }) {
  return <Box component="img" src={vnLogo} alt="Vynerix VN" sx={{ width: 56, height: 44, flexShrink: 0, ...sx }} />;
}
