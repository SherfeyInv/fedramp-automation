import { selectVisibleScenarioSummaries } from '@asap/browser/presenter/state/selectors';
import { SchematronRulesetKey } from '@asap/shared/domain/schematron';
import { useSelector } from '../context';
import { CodeViewer } from './CodeViewer';

export const AssertionXSpecScenarios = ({
  rulesetKey,
}: {
  rulesetKey: SchematronRulesetKey;
}) => {
  const scenarioSummaries = useSelector(
    selectVisibleScenarioSummaries(rulesetKey),
  );
  return (
    <ul>
      {scenarioSummaries.map((summary, index) => (
        <li key={index}>
          {summary.scenarios.map((s, index) =>
            s.url ? (
              <a key={index} href={s.url} target="_blank" rel="noopener">
                {s.label}
              </a>
            ) : (
              <span>{s.label} </span>
            ),
          )}{' '}
          <span className="text-bold">{summary.assertionLabel}</span>
          {summary.referenceUrl ? (
            <>
              {' '}
              <a
                href={summary.referenceUrl}
                className="text-primary text-underline"
                target="_blank"
                rel="noopener"
              >
                View XSpec
              </a>
            </>
          ) : null}
          <CodeViewer codeHTML={summary.context}></CodeViewer>
        </li>
      ))}
    </ul>
  );
};
