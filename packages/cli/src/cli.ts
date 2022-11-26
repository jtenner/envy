import { parseArgs, ParseArgsConfig } from "util";
import { main as asc, DiagnosticMessage } from "assemblyscript/dist/asc";
import { sync as glob } from "glob";
import path from "path";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import { getRandomValues } from "crypto";
import cp from "child_process";

export async function cli() {
  const cliConfig: ParseArgsConfig = {
    options: {
      "asconfig": {
        type: "string",
        default: "./envy.asconfig.json",
        short: "a",
      },
      "init": {
        type: "boolean",
        default: false,
      },
      "output-binary": {
        type: "boolean",
        default: false,
      },
    },
    allowPositionals: true,
  };

  // parse the cli args
  const parsedArgs = parseArgs(cliConfig);
  const asconfig = parsedArgs.values["asconfig"] as string;
  // const init = parsedArgs.values["init"] as boolean;
  const outputBinary = parsedArgs.values["output-binary"] as string;
  const globs = parsedArgs.positionals;
  const fileWrites = [] as Promise<any>[];

  // create all the entries, compile a module for each one
  const fileMap = new Map<string, string>();
  const wasmFiles = new Array<string>();
  const entrySet = new Set<string>();
  for (const pattern of globs) {
    for (const fileEntry of glob(pattern)) {
      entrySet.add(fileEntry);
    }
  }

  // create a temp folder
  const tempDirectory = await fs.mkdtemp(path.join(tmpdir(), "-envy"));
  const diagnostics = [] as DiagnosticMessage[];

  // for each entry point
  for (const entry of entrySet) {

    asc(["--config", asconfig, entry], {
      reportDiagnostic(diagnostic) {
        diagnostics.push(diagnostic);
      },
      stderr: process.stderr,
      stdout: process.stdout,
      readFile(filename, baseDir) {
        const fileLocation = path.join(baseDir, filename);
        if (fileMap.has(fileLocation)) return fileMap.get(fileLocation)!;
        const output = fs.readFile(fileLocation, "utf-8");
        output.then(contents => fileMap.set(fileLocation, contents));
        return output;
      },
      listFiles(dirname, baseDir) {
        const dirLocation = path.join(baseDir, dirname);
        return fs.readdir(dirLocation);
      },
      writeFile(filename, contents, baseDir) {
        const fileLocation = path.join(filename, baseDir);
        const extension = path.extname(fileLocation);
  
        // if we are the wasm file, we check to see if we output the binary to the directory
        if (extension === ".wasm") {
          if (outputBinary) {
            fileWrites.push(fs.writeFile(fileLocation, contents));
          }
  
          // we need to make a temporary wasm file for running later.
          const tempFileName = getRandomValues(Buffer.alloc(30)).toString("base64") + ".wasm";
          const tempFileLocation = path.join(tempDirectory, tempFileName)
          fileWrites.push(fs.writeFile(tempFileLocation, contents));
          wasmFiles.push(tempFileLocation);
        } else {
          fileWrites.push(fs.writeFile(fileLocation, contents));
        }
      },
    });
  }

  // wait for all the files to be written before running lunatic
  await Promise.allSettled(fileWrites);

  // run every test in lunatic
  let status = 0;
  // run every file in lunatic
  for (const wasmFile of wasmFiles) {
    const output = cp.spawnSync("lunatic", [wasmFile]);
    status |= (output.status ?? 0);
  }

  if (status != 0) {
    process.stderr.write(`\n\nProcess failed.`);
    process.exitCode = 1;
  }

  await fs.unlink(tempDirectory);
}

cli();
