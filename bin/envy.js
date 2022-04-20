#!/usr/bin/env node
import { spawn } from "child_process";
import { parse } from "url";
import path from "path";

const binLocation = import.meta.url;
const parsedBinLocation = parse(binLocation);
const binFileLocation = parsedBinLocation.pathname.slice(1);
const libFileLocation = path.join(binFileLocation, "../../lib/bootstrap.js");

const args = [
  "--experimental-wasi-unstable-preview1",
  "--enable-source-maps",
  libFileLocation,
].concat(process.argv.slice(2));

const envyProcess = spawn("node", args, {stdio: "inherit"});
envyProcess.ref();
