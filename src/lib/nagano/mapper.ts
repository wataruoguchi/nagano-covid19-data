const fs = require("fs");
import { dirs, summary } from "../types";
import { buildJsonPath } from "../converter/utils";
import { openLocalFile } from "../openLocalFiles";
import {
  CONST_KENSA,
  CONST_SOUDAN,
  CONST_HASSEI,
  CONST_PATIENTS,
  CONST_TEST_COUNT,
  CONST_CALL_CENTER
} from "./const";
import { kensa, soudan, hasseijoukyou } from "./types";
import {
  buildDataBySoudan,
  buildDataByKensa,
  buildDataByHasseiAndKensa
} from "./mapperChunks/legacyChunk";
import { patient, testCount, callCenter } from "./nagano_opendata_spec_covid19";
import {
  buildDataByPatientAndTestCount,
  buildDataByTestCount,
  buildDataByCallCenter
} from "./mapperChunks/newFormatChunk";

async function mapper(resAll: summary[], dirs: dirs): Promise<void> {
  // Mapping multiple data into data.json

  // Legacy chunk
  const [soudanRows] = resAll
    .filter((res) => res.type === CONST_SOUDAN)
    .map((res) => <soudan[]>res.json);
  const [kensaRows] = resAll
    .filter((res) => res.type === CONST_KENSA)
    .map((res) => <kensa[]>res.json);
  const [hasseijoukyouRows] = resAll
    .filter((res) => res.type === CONST_HASSEI)
    .map((res) => <hasseijoukyou[]>res.json);
  const dataBasedOnSoudan = buildDataBySoudan(soudanRows);
  const dataBasedOnKensa = buildDataByKensa(kensaRows);
  const dataBasedOnHassei = buildDataByHasseiAndKensa(
    hasseijoukyouRows,
    kensaRows
  );

  // New format chunk
  const [patientRows] = resAll
    .filter((res) => res.type === CONST_PATIENTS)
    .map((res) => <patient[]>res.json);
  const [testCountRows] = resAll
    .filter((res) => res.type === CONST_TEST_COUNT)
    .map((res) => <testCount[]>res.json);
  const [callCenterRows] = resAll
    .filter((res) => res.type === CONST_CALL_CENTER)
    .map((res) => <callCenter[]>res.json);
  const dataBasedOnPatientAndTestCount = buildDataByPatientAndTestCount(
    patientRows,
    testCountRows
  );
  const dataBasedOnTestCount = buildDataByTestCount(testCountRows);
  const dataBasedOnCallCenter = buildDataByCallCenter(callCenterRows);

  let currentDataItem;
  try {
    currentDataItem = await openLocalFile(
      buildJsonPath("data.json", dirs.dist || ""),
      "utf8"
    );
  } catch {
    currentDataItem = "{}";
  }

  const currentData = currentDataItem ? JSON.parse(currentDataItem) || {} : {};
  const mappedJson = {
    ...currentData,
    ...dataBasedOnSoudan,
    ...dataBasedOnKensa,
    ...dataBasedOnHassei,
    ...dataBasedOnPatientAndTestCount, // These new data should overwrite Soudan/Kensa/Hassei based data.
    ...dataBasedOnTestCount,
    ...dataBasedOnCallCenter
  };

  return new Promise((resolve, reject) => {
    try {
      fs.writeFileSync(
        buildJsonPath("data.json", dirs.dist || ""),
        JSON.stringify(mappedJson, null, 2)
      );
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

export { mapper };
