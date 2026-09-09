import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const urlSchemePattern = /^[a-z][a-z0-9+.-]*:\/\//i;
const scpLikePattern = /^[^\s/@-][^\s/@]*@[^\s/:]+:/;

export const isGitUrl = (value: string): boolean =>
    urlSchemePattern.test(value) || scpLikePattern.test(value);

export const repositoryUrl = (cloneBase: string, name: string): string =>
    isGitUrl(cloneBase)
        ? `${cloneBase.replace(/\/+$/, "")}/${name}`
        : pathToFileURL(resolve(cloneBase, name)).href;
