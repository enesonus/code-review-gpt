import { Gitlab } from "@gitbeaker/rest";

import { getGitLabEnvVariables } from "../../../config";
import { logger } from "../../utils/logger";
/**
 * Publish a comment on the pull request. If the bot has already commented (i.e. a comment with the same sign off exists), update the comment instead of creating a new one.
 * The comment will be signed off with the provided sign off.
 * @param comment The body of the comment to publish.
 * @param signOff The sign off to use. This also serves as key to check if the bot has already commented and update the comment instead of posting a new one if necessary.
 * @returns
 */
export const sendSlackMessage = async (
	comment: string,
	signOff: string
): Promise<void> => {
	try {
		const {
			mergeRequestBaseSha,
			gitlabToken,
			projectId,
			gitlabSha,
			mergeRequestIIdString,
			gitlabHost,
		} = getGitLabEnvVariables();

        console.log(`mergeRequestBaseSha: ${mergeRequestBaseSha}, gitlabToken: ${gitlabToken}, projectId: ${projectId}, gitlabSha: ${gitlabSha}, mergeRequestIIdString: ${mergeRequestIIdString}, gitlabHost: ${gitlabHost}`);
        process.stdout.write(`mergeRequestBaseSha: ${mergeRequestBaseSha}, gitlabToken: ${gitlabToken}, projectId: ${projectId}, gitlabSha: ${gitlabSha}, mergeRequestIIdString: ${mergeRequestIIdString}, gitlabHost: ${gitlabHost}\n`);
		const api = new Gitlab({
			token: gitlabToken,
			host: gitlabHost,
		});

        const test = await api.Commits.show(projectId, gitlabSha);

        console.log(`test: ${JSON.stringify(test)}`);
        process.stdout.write(`test: ${JSON.stringify(test)}\n`);
	} catch (error) {
		logger.error(`Failed to comment on PR: ${JSON.stringify(error)}`);
		throw error;
	}
};
