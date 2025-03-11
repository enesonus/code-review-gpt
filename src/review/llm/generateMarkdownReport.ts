import type { IFeedback, IReviews } from "../../common/types";

export const formatReviewCI = (reviews: IReviews): string => {
  return reviews
    .map(
      (review) => `
${review.reasoning}

${
  review.suggestedChanges
    ? `Suggested changes:
\`\`\`suggestion
${review.suggestedChanges}
\`\`\`
`
    : ''
}

<details>
<summary>View Original Code</summary>

\`\`\`code
${review.targetCodeBlock}
\`\`\`

</details>
`
		)
		.join("\n");
};

export const formatReviewSlack = (reviews: IReviews): string => {
	return reviews
		.map(
			(review) => {
				const parts = [];
				
				// Add reasoning
				parts.push(review.reasoning);
				
				// Add suggested changes if present
				if (review.suggestedChanges) {
					parts.push(`*Suggested changes*
\`\`\`
${review.suggestedChanges}
\`\`\``);
				}
				
				// Add original code
				parts.push(`*Original Code*
\`\`\`
${review.targetCodeBlock}
\`\`\``);
				
				return parts.join('\n\n');
			}
		)
		.join("\n---\n");
};

const formatFeedbackCI = (feedback: IFeedback): string => `
**Risk Level ${feedback.riskScore} - ${feedback.fileName}**

${formatReviewCI(feedback.review)}
`;

const formatFeedbackSlack = (feedback: IFeedback): string => `
*Risk Level ${feedback.riskScore} - ${feedback.fileName}*

${formatReviewSlack(feedback.review)}
`;

export const markdownReport = (
	feedbacks: IFeedback[],
	reviewChannel: string
): string | object => {
	switch (reviewChannel) {
		case "ci":
			return `
  ${feedbacks.map(formatFeedbackCI).join("\n---\n")}
  `;
		case "slack":
			const blocks = [];
			for (const feedback of feedbacks) {
				// Add header for each feedback
				blocks.push({
					type: "header",
					text: {
						type: "plain_text",
						text: `Risk Level ${feedback.riskScore} - ${feedback.fileName}`
					}
				});

				feedback.review.forEach((review, index) => {
					// Add comment number header
					blocks.push({
						type: "header",
						text: {
							type: "plain_text",
							text: `Comment ${index + 1}`
						}
					});

					const parts = [];
					
					// Add reasoning
					parts.push(review.reasoning);
					
					// Add suggested changes if present
					if (review.suggestedChanges) {
						parts.push(`*Suggested changes*
\`\`\`
${review.suggestedChanges}
\`\`\``);
					}
					
					// Add original code
					parts.push(`*Original Code*
\`\`\`
${review.targetCodeBlock}
\`\`\``);

					// Create section for this review
					blocks.push({
						type: "section",
						text: {
							type: "mrkdwn",
							text: parts.join('\n\n')
						}
					});

					// Add divider after each review except the last one
					if (index < feedback.review.length - 1) {
						blocks.push({
							type: "divider"
						});
					}
				});

				// Add divider between feedbacks
				if (feedback !== feedbacks[feedbacks.length - 1]) {
					blocks.push({
						type: "divider"
					});
				}
			}
			return { blocks };
		default:
			throw new Error("Invalid review channel");
	}
};
