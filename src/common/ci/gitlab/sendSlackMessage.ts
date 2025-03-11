import { Gitlab } from "@gitbeaker/rest";
import axios from "axios";

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
	comment: string | { blocks: any[] },
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
		logger.info("Sending Slack message");
		const api = new Gitlab({
			token: process.env.GITLAB_TOKEN ?? "",
			host: process.env.GITLAB_HOST ?? "https://gitlab.com",
		});

		const commitInfo = await api.Commits.show(
			// "43058895",
			// "7526a0096c5ca0b151425a1563eb05ac8f1302ca"
			projectId,
			gitlabSha
		);

		// Get committer email from commit info
		const committerEmail = commitInfo.committer_email;
        
		// Create commit URL
		const commitUrl = `${gitlabHost}/${projectId}/-/commit/${gitlabSha}`;
        
		// Add commit link to blocks if it's a blocks message
		if (typeof comment === 'object' && comment.blocks) {
			// Add a header with the commit link at the beginning
			comment.blocks.unshift({
				type: "header",
				text: {
					type: "plain_text",
					text: `Review for commit: ${gitlabSha.substring(0, 8)}`
				}
			});
			
			// Add a section with clickable link after the header
			comment.blocks.splice(1, 0, {
				type: "section",
				text: {
					type: "mrkdwn",
					text: `<${commitUrl}|View commit on GitLab>`
				}
			});
		}
		// For string messages, prepend the commit link
		else if (typeof comment === 'string') {
			comment = `*Review for commit: ${gitlabSha.substring(0, 8)}*\n<${commitUrl}|View commit on GitLab>\n\n${comment}`;
		}

		try {
			// First lookup the user by email
			const userLookupResponse = await axios.get(
				"https://slack.com/api/users.lookupByEmail",
				{
					params: {
						email: committerEmail,
					},
					headers: {
						Authorization: `Bearer ${process.env.SLACK_BOT_KEY}`,
					},
				}
			);

			if (userLookupResponse.data.ok) {
				const userId = userLookupResponse.data.user.id;

				// Open a conversation with the user
				const conversationResponse = await axios.post(
					"https://slack.com/api/conversations.open",
					{
						users: userId,
					},
					{
						headers: {
							Authorization: `Bearer ${process.env.SLACK_BOT_KEY}`,
							"Content-Type": "application/json",
						},
					}
				);

				if (conversationResponse.data.ok) {
					const channelId = conversationResponse.data.channel.id;

					// Send message to the opened conversation
					const messagePayload =
						typeof comment === "string"
							? {
									channel: channelId,
									text: comment,
									as_user: true,
							  }
							: {
									channel: channelId,
									...comment,
									as_user: true,
							  };

					const messageResponse = await axios.post(
						"https://slack.com/api/chat.postMessage",
						messagePayload,
						{
							headers: {
								Authorization: `Bearer ${process.env.SLACK_BOT_KEY}`,
								"Content-Type": "application/json",
							},
						}
					);

					if (messageResponse.data.ok) {
						logger.info("Message sent successfully");
					} else {
						logger.error(
							`Failed to send message: ${JSON.stringify(messageResponse.data)}`
						);
					}
				} else {
					logger.error(
						`Failed to open conversation: ${JSON.stringify(
							conversationResponse.data
						)}`
					);
				}
			} else {
				logger.error(
					`Failed to lookup user: ${JSON.stringify(userLookupResponse.data)}`
				);
			}
		} catch (slackError) {
			logger.error(
				`Failed to interact with Slack: ${JSON.stringify(slackError)}`
			);
			throw slackError;
		}
	} catch (error) {
		logger.error(`Failed to send message: ${JSON.stringify(error)}`);
		throw error;
	}
};
