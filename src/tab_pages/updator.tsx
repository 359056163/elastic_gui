import React, { useState } from 'react';
import { Modal, Form, Divider, Button, Input, Select, message } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { FormListFieldData } from 'antd/lib/form/FormList';

const { Option } = Select;

export interface IUpdatorProps {
  visible: boolean;
  fields: string[];
  onOk(update: any): void;
  onCancel(): void;
}

interface SelectedValidation {
  validateStatus: '' | 'success' | 'error' | 'validating' | 'warning';
  help: string;
}

export function Updator(props: IUpdatorProps) {
  const { visible, fields, onOk, onCancel } = props;
  const [selectedField, setSelectedField] = useState<string>(fields[0]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [form] = Form.useForm();
  const [validation, setValidation] = useState<SelectedValidation>({
    validateStatus: '',
    help: '',
  });
  return (
    <Modal
      visible={visible}
      title="数据更新"
      width={700}
      closable
      onOk={async () => {
        const values = await form.validateFields();
        const update: any = {};
        values.updator.forEach((v: string | number, index: number) => {
          const field: string = selectedFields[index];
          update[field] = v;
        });
        onOk(update);
        form.resetFields();
      }}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
    >
      <Form form={form}>
        <Form.List name="updator">
          {(fieldList: FormListFieldData[], { add, remove }) => (
            <>
              {selectedFields.map((field, index) => {
                return (
                  <Form.Item label={field} name={index} key={field}>
                    <Input
                      addonAfter={
                        <MinusCircleOutlined
                          onClick={() => {
                            remove(index);
                            selectedFields.splice(index, 1);
                            setSelectedFields(selectedFields);
                          }}
                        />
                      }
                      name={field}
                    />
                  </Form.Item>
                );
              })}
              <Divider />
              <Form.Item
                label="字段"
                key="fieldSelector"
                validateStatus={validation.validateStatus}
                help={validation.help}
              >
                <Select
                  placeholder="选择要添加的字段"
                  defaultValue={selectedField}
                  onChange={(value: string) => {
                    if (value) {
                      validation.validateStatus = '';
                      validation.help = '';
                    } else {
                      validation.validateStatus = 'error';
                      validation.help = '必须先选择一个字段';
                    }
                    setValidation(validation);
                    setSelectedField(value);
                  }}
                  disabled={selectedFields.length === fields.length}
                >
                  {fields
                    .filter((field) => {
                      return !selectedFields.find((f) => f === field);
                    })
                    .map((field) => {
                      return (
                        <Option key={field} value={field}>
                          {field}
                        </Option>
                      );
                    })}
                </Select>
              </Form.Item>
              <Form.Item>
                <Button
                  type="dashed"
                  onClick={() => {
                    if (!selectedField) {
                      validation.validateStatus = 'error';
                      validation.help = '必须先选择一个字段';
                      setValidation(validation);
                      return;
                    }
                    validation.validateStatus = '';
                    validation.help = '';
                    setValidation(validation);
                    add();
                    selectedFields.push(selectedField);
                    setSelectedFields(selectedFields);
                  }}
                  block
                  icon={<PlusOutlined />}
                  disabled={selectedFields.length === fields.length}
                >
                  添加
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
}
