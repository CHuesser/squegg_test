/** @jsxRuntime classic */
/** @jsx jsx */
import { Fragment, useCallback, useState } from "react";
import { useSpring, animated } from "react-spring";
import {
  Heading,
  Button,
  Text,
  Spinner,
  Box,
  Container,
  jsx,
  Alert
} from "theme-ui";

import {
  parseSquegg,
  CharCodes,
  SqueggData,
  BLUETOOTH_DEVICE_OPTIONS,
  SERVICE_UUID as DEFAULT_SERVICE_UUID,
  CHARACTERISTIC_UUID as DEFAULT_CHARACTERISTIC_UUID,
  dataViewToArray
} from "@lasseborly/squegg-sdk";

import { GripThreshold, useGrip } from "./hooks";
import { CenterCol } from "./components/CenterCol";

// Derived from numerous physical tests.
// Might change with the sensitivity of the device if sensors
// will be changed in the future.
const DEFAULT_LOWER_STRENGTH_BOUNDARY = 2.0;
const DEFAULT_GRIP_THRESHOLD = 5;

interface AppProps {
  /** If a strength score is below this regard it as zero. */
  lowerStrengthBoundary?: number;
  /** If a strength score is above this, regard it as a grip/squeeze. */
  gripThreshold?: GripThreshold;
  /**
   * Unique identifier of the BT service the squegg device emits.
   * The default value might change at a later date if squegg-sdk updates.
   * If
   */
  serviceUuid: string;
  /**
   * Unique identifier of the specific characteristic that stores
   * the values being used to read the current pressure applied to the
   * squegg device.
   * The default value might change at a later date if squegg-sdk updates.
   */
  characteristicUuid: string;
}

export default function App({
  lowerStrengthBoundary = DEFAULT_LOWER_STRENGTH_BOUNDARY,
  gripThreshold = DEFAULT_GRIP_THRESHOLD,
  serviceUuid = DEFAULT_SERVICE_UUID,
  characteristicUuid = DEFAULT_CHARACTERISTIC_UUID
}: AppProps) {
  /**
   * Make use of a tiny state machine that is easier to parse when
   * going through the flow of the application.
   */
  type Status = "initial" | "connected" | "error" | "connecting";
  const [status, setStatus] = useState<Status>("initial");

  const [squeggData, setSqueggData] = useState<SqueggData>({
    strength: 0.0,
    isSqueezing: false,
    batteryCharge: 0
  });

  const [springProps, setSpring] = useSpring<{ strength: number }>(() => ({
    strength: 0
  }));

  const valueChanged = useCallback(
    function updateSqueggData(event: Event) {
      const target = event.target as BluetoothRemoteGATTCharacteristic;
      const dataView = target.value;
      if (dataView) {
        const charCodes: CharCodes = dataViewToArray(dataView);
        const newSqueggData = parseSquegg(charCodes);

        // Due to the sensitivity of the device and it's flaky behavior
        // we want to regard low scores as practically zero.
        // Otherwise we might just get stuck with a low score, event though
        // the squegg isn't being pressed.
        const showZeroStrength =
          newSqueggData.strength <= lowerStrengthBoundary;

        setSpring({ strength: showZeroStrength ? 0 : newSqueggData.strength });
        setSqueggData(newSqueggData);
      }
    },
    [lowerStrengthBoundary, setSpring]
  );

  const onClickConnect = useCallback(
    async function connect() {
      setStatus("connecting");

      try {
        const device = await navigator.bluetooth.requestDevice(
          BLUETOOTH_DEVICE_OPTIONS
        );
        const couldNotFindDevice = !device || !device?.gatt;
        if (couldNotFindDevice) throw Error("Device could not be found.");

        const server = await device.gatt.connect();
        const service = await server.getPrimaryService(serviceUuid);
        const characteristic = await service.getCharacteristic(
          characteristicUuid
        );

        await characteristic.startNotifications();
        characteristic.addEventListener(
          "characteristicvaluechanged",
          valueChanged
        );
        setStatus("connected");
      } catch (error) {
        setStatus("error");
        setTimeout(() => {
          setStatus("initial");
        }, 2000);
        console.error(error);
      }
    },
    [characteristicUuid, serviceUuid, valueChanged]
  );

  const grips = useGrip({ squeggData, gripThreshold });

  return (
    <Container
      sx={{
        display: "grid",
        height: "100vh"
      }}
      mt={3}
    >
      {status === "initial" && (
        <CenterCol>
          <Heading as="h1" mb={3}>
            Connect your Squegg
          </Heading>
          <Button
            sx={{
              width: "50%"
            }}
            onClick={onClickConnect}
            id="ble-connect"
          >
            Connect
          </Button>
        </CenterCol>
      )}

      {status === "connecting" && (
        <CenterCol>
          <Spinner mt={3} />
        </CenterCol>
      )}

      {status === "connected" && (
        <Fragment>
          <animated.div />
          <CenterCol>
            <Heading>Measure your strength</Heading>
            <Text
              sx={{
                fontSize: "7"
              }}
            >
              <animated.div>
                {springProps.strength.interpolate((strengthValue) =>
                  Math.round(strengthValue)
                )}
              </animated.div>
            </Text>
            <Heading>Count your grips</Heading>
            <Text
              sx={{
                fontSize: "7"
              }}
            >
              {grips}
            </Text>
          </CenterCol>
        </Fragment>
      )}

      {status === "error" && (
        <Box>
          <Alert variant="error">An error occurred.</Alert>
        </Box>
      )}
    </Container>
  );
}
