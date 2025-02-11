const aws = require('./aws');
const gh = require('./gh');
const config = require('./config');
const core = require('@actions/core');

function setOutput(label, runnerName, ec2InstanceId) {
  core.setOutput('label', label);
  core.setOutput('runnerName', runnerName);
  core.setOutput('ec2-instance-id', ec2InstanceId);
}

async function start() {
  const label = config.generateUniqueLabel();
  const runnerName = config.generateUniqueName(15);
  const runnerExists = await gh.getRunner(label, runnerName);
  if (runnerExists) {
    await gh.removeRunner(runnerName);
  }
  const githubRegistrationToken = await gh.getRegistrationToken();
  const ec2Instance = await aws.startEc2InstanceExponential(label, runnerName, githubRegistrationToken);
  setOutput(label, runnerName, ec2Instance.InstanceId);
  await aws.waitForInstanceRunning(ec2Instance.InstanceId);
  await gh.waitForRunnerRegistered(label, runnerName);
}

async function stop() {
  await aws.terminateEc2Instance();
  await gh.removeRunner();
}

(async function () {
  try {
    config.input.mode === 'start' ? await start() : await stop();
  } catch (error) {
    core.error(error);
    core.setFailed(error.message);
  }
})();
