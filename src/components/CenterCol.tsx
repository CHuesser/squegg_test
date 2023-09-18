import { Flex } from "theme-ui";

interface CenterColProps {
  children: JSX.Element | JSX.Element[];
}

export function CenterCol(props: CenterColProps) {
  return (
    <Flex
      sx={{
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column"
      }}
      {...props}
    />
  );
}
