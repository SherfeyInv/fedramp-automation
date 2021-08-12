import { derived, Statemachine, statemachine } from 'overmind';

import type {
  SchematronAssert,
  FailedAssert,
} from '@asap/shared/use-cases/schematron';

import { createValidatorMachine, ValidatorMachine } from './validator-machine';

export type Role = string;

type States = {
  current: 'LOADED';
};

type BaseState = {
  _assertionsById: {
    [assertionId: string]: SchematronAssert;
  };
  assertionGroups: {
    title: string;
    asserts: {
      id: string;
    }[];
  }[];
  filter: {
    role: Role;
    text: string;
  };
  _filterRoles: Role[];
  roles: Role[];
  schematronReport: {
    summary: {
      title: string;
      counts: {
        assertions: number;
        reports: number;
      };
    };
    groups: {
      title: string;
      //see: string;
      checks: {
        summary: string;
        summaryColor: 'red' | 'green';
        checks: (SchematronAssert & {
          icon: typeof checkCircleIcon;
          fired: FailedAssert[];
        })[];
      };
    }[];
  };
  _schematronAsserts: SchematronAssert[];
  _schematronChecksFiltered: SchematronAssert[];
  validator: ValidatorMachine;
};

type Events =
  | {
      type: 'FILTER_TEXT_CHANGED';
      data: {
        text: string;
      };
    }
  | {
      type: 'FILTER_ROLE_CHANGED';
      data: {
        role: Role;
      };
    }
  | {
      type: 'ASSERTIONS_FOUND';
      data: {
        schematronAsserts: SchematronAssert[];
      };
    };

export type SchematronMachine = Statemachine<States, Events, BaseState>;

const checkCircleIcon = { sprite: 'check_circle', color: 'green' };
const navigateNextIcon = { sprite: 'navigate_next', color: 'blue' };
const cancelIcon = {
  sprite: 'cancel',
  color: 'red',
};

const schematronMachine = statemachine<States, Events, BaseState>({
  LOADED: {
    FILTER_TEXT_CHANGED: ({ text }, state) => {
      return {
        current: 'LOADED',
        filter: {
          role: state.filter.role,
          text,
        },
        _schematronAsserts: [...state._schematronAsserts],
      };
    },
    FILTER_ROLE_CHANGED: ({ role }, state) => {
      return {
        current: 'LOADED',
        filter: {
          role: role,
          text: state.filter.text,
        },
        _schematronAsserts: [...state._schematronAsserts],
      };
    },
    ASSERTIONS_FOUND: ({ schematronAsserts }, state) => {
      return {
        current: 'LOADED',
        filter: { ...state.filter },
        _schematronAsserts: schematronAsserts,
      };
    },
  },
});

export const createSchematronMachine = () => {
  return schematronMachine.create(
    { current: 'LOADED' },
    {
      _assertionsById: derived((state: SchematronMachine) => {
        const assertions: SchematronMachine['_assertionsById'] = {};
        state._schematronChecksFiltered.forEach(assert => {
          assertions[assert.id] = assert;
        });
        return assertions;
      }),
      assertionGroups: derived((state: SchematronMachine) => {
        // Return a sample assertion group corresponding to the source rules.
        return [
          {
            title: 'System Security Plan',
            asserts: state._schematronAsserts,
          },
        ];
      }),
      filter: {
        role: 'all',
        text: '',
      },
      _filterRoles: derived((state: SchematronMachine) => {
        switch (state.filter.role) {
          case 'all':
            return state.roles;
          default:
            return [state.filter.role];
        }
      }),
      roles: derived((state: SchematronMachine) => [
        'all',
        ...Array.from(
          new Set(state._schematronAsserts.map(assert => assert.role)),
        ).sort(),
      ]),
      schematronReport: derived(
        ({
          _assertionsById,
          _schematronChecksFiltered,
          assertionGroups,
          validator,
        }: SchematronMachine) => {
          const isValidated = validator.current === 'VALIDATED';
          const reportCount = _schematronChecksFiltered.filter(
            c => c.isReport,
          ).length;
          return {
            summary: {
              title: isValidated
                ? 'FedRAMP Package Concerns and Notes'
                : 'FedRAMP Package Concerns and Notes (unprocessed)',
              counts: {
                assertions: _schematronChecksFiltered.length - reportCount,
                reports: reportCount,
              },
            },
            groups: assertionGroups.map(assertionGroup => {
              type UiAssert = SchematronAssert & {
                message: string;
                icon: typeof checkCircleIcon;
                fired: FailedAssert[];
              };
              const checks = assertionGroup.asserts
                .map(assertionGroupAssert => {
                  const assert = _assertionsById[assertionGroupAssert.id];
                  if (!assert) {
                    return null;
                  }
                  const fired = validator.assertionsById[assert.id] || [];
                  return {
                    ...assert,
                    // message: `${assert.id} ${assert.message}`,
                    icon: !isValidated
                      ? navigateNextIcon
                      : fired.length
                      ? cancelIcon
                      : checkCircleIcon,
                    fired,
                  };
                })
                .filter(
                  (assert: UiAssert | null): assert is UiAssert =>
                    assert !== null,
                );
              const firedCount = checks.filter(
                assert => assert.fired.length > 0,
              ).length;
              return {
                title: assertionGroup.title,
                checks: {
                  summary: (() => {
                    if (isValidated) {
                      return `${firedCount} / ${checks.length} triggered`;
                    } else {
                      return `${checks.length} checks`;
                    }
                  })(),
                  summaryColor: firedCount === 0 ? 'green' : 'red',
                  checks,
                },
              };
            }),
          };
        },
      ),
      _schematronAsserts: [] as SchematronAssert[],
      _schematronChecksFiltered: derived(
        ({ filter, _filterRoles, _schematronAsserts }: SchematronMachine) => {
          let assertions = _schematronAsserts.filter(
            (assertion: SchematronAssert) => {
              return _filterRoles.includes(assertion.role || '');
            },
          );
          if (filter.text.length > 0) {
            assertions = assertions.filter(assert => {
              const searchText = assert.message.toLowerCase();
              return searchText.includes(filter.text.toLowerCase());
            });
          }
          return assertions;
        },
      ),
      validator: createValidatorMachine(),
    },
  );
};