import { execFileSync } from 'node:child_process';
export function releaseInfoPlugin() {
  let commit = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || '';
  let dirty = false;
  try {
    if (!commit) commit = execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
    dirty = Boolean(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim());
  } catch { /* Unknown revision is explicit. */ }
  const release = {commit:commit || null,dirty,builtAt:new Date().toISOString()};
  return {name:'release-info',generateBundle(){this.emitFile({type:'asset',fileName:'release.json',source:JSON.stringify(release)});}};
}
