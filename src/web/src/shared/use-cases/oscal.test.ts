import { it, describe, expect, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { SchematronProcessors } from '../domain/schematron';

import { OscalService } from './oscal';

const MOCK_SCHEMATRON_RESULT = {
  failedAsserts: ['assertion 1', 'assertion 2'],
  svrlString: '<svrl />',
  successfulReports: [{ id: 'info-system-name', text: 'title text' }],
};
const EXPECTED_VALIDATION_REPORT = {
  title: 'title text',
  failedAsserts: ['assertion 1', 'assertion 2'],
};

describe('validate ssp use case', () => {
  const mockXml = '<xml>xml {[]} input</xml>';
  it('returns schematron for xml input', async () => {
    const ctx = {
      console: mock<Console>(),
      jsonOscalToXml: vi.fn().mockReturnValue(Promise.resolve('')),
      schematronProcessors: mock<SchematronProcessors>({
        rev4: vi.fn().mockReturnValue(
          Promise.resolve({
            documentType: 'ssp',
            schematronResult: MOCK_SCHEMATRON_RESULT,
          }),
        ),
      }),
      fetch: vi.fn(),
    };
    const oscalService = new OscalService(
      {
        ssp: ctx.jsonOscalToXml,
        sap: ctx.jsonOscalToXml,
        sar: ctx.jsonOscalToXml,
        poam: ctx.jsonOscalToXml,
      },
      ctx.schematronProcessors,
      ctx.fetch,
      ctx.console,
    );
    const retVal = await oscalService.validateXml('rev4', mockXml);
    expect(retVal).toEqual({
      documentType: 'ssp',
      svrlString: '<svrl />',
      validationReport: EXPECTED_VALIDATION_REPORT,
    });
  });

  it('returns schematron for json input', async () => {
    const testJson = async (mockJson: string) => {
      const ctx = {
        console: mock<Console>(),
        jsonOscalToXml: vi.fn().mockReturnValue(Promise.resolve(mockXml)),
        schematronProcessors: mock<SchematronProcessors>({
          rev4: vi.fn().mockReturnValue(
            Promise.resolve({
              documentType: 'ssp',
              schematronResult: MOCK_SCHEMATRON_RESULT,
            }),
          ),
        }),
        fetch: vi.fn(),
      };
      const oscalService = new OscalService(
        {
          ssp: ctx.jsonOscalToXml,
          sap: ctx.jsonOscalToXml,
          sar: ctx.jsonOscalToXml,
          poam: ctx.jsonOscalToXml,
        },
        ctx.schematronProcessors,
        ctx.fetch,
        ctx.console,
      );
      const retVal = await oscalService.validateOscal('rev4', mockJson);
      expect(ctx.jsonOscalToXml).toHaveBeenCalledWith(mockJson);
      expect(ctx.schematronProcessors.rev4).toHaveBeenCalledWith(mockXml);
      expect(retVal).toEqual({
        documentType: 'ssp',
        svrlString: '<svrl />',
        validationReport: EXPECTED_VALIDATION_REPORT,
        xmlString: mockXml,
      });
    };

    testJson('{"system-security-plan": {}}');
  });
});

describe('validate ssp url use case', () => {
  it('passes through return value from adapter', async () => {
    const xmlString = '<xml>ignored</xml>';
    const ctx = {
      console: mock<Console>(),
      fetch: vi.fn().mockImplementation((url: string) => {
        return Promise.resolve({
          text: vi.fn().mockImplementation(async () => {
            expect(url).toEqual('https://sample.gov/ssp-url.xml');
            return xmlString;
          }),
        });
      }),
      jsonOscalToXml: vi.fn().mockReturnValue(xmlString),
      schematronProcessors: mock<SchematronProcessors>({
        rev4: vi.fn().mockImplementation(xmlStr => {
          expect(xmlStr).toEqual(xmlString);
          return Promise.resolve({
            documentType: 'ssp',
            schematronResult: MOCK_SCHEMATRON_RESULT,
          });
        }),
      }),
    };
    const oscalService = new OscalService(
      {
        ssp: ctx.jsonOscalToXml,
        sap: ctx.jsonOscalToXml,
        sar: ctx.jsonOscalToXml,
        poam: ctx.jsonOscalToXml,
      },
      ctx.schematronProcessors,
      ctx.fetch,
      ctx.console,
    );
    const retVal = await oscalService.validateOscalByUrl(
      'rev4',
      'https://sample.gov/ssp-url.xml',
    );
    expect(retVal).toEqual({
      documentType: 'ssp',
      svrlString: '<svrl />',
      validationReport: EXPECTED_VALIDATION_REPORT,
      xmlString,
    });
  });
});
