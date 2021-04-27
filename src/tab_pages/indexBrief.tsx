import React from 'react';
import { Tag, Descriptions } from 'antd';
import { AlertOutlined } from '@ant-design/icons';
import { ElasticIndexBrief, Health } from '../interfaces';

export interface IndexBriefProps {
  brief: ElasticIndexBrief | null;
}

export function IndexBrief(props: IndexBriefProps) {
  const { brief } = props;

  if (brief === null) {
    return <></>;
  }

  let healthColor: string;
  switch (brief?.health) {
    case 'yellow':
      healthColor = Health.yellow;
      break;
    case 'green':
      healthColor = Health.green;
      break;
    case 'red':
      healthColor = Health.red;
      break;
    default:
      healthColor = Health.yellow;
      break;
  }

  return (
    <Descriptions size="small">
      <Descriptions.Item label="Total Docs">
        {brief?.docsCount}
      </Descriptions.Item>

      <Descriptions.Item label="Deleted Docs">
        {brief?.docsDeleted}
      </Descriptions.Item>

      <Descriptions.Item label="Index Health">
        <Tag color={healthColor}>
          <AlertOutlined />
          {brief?.health}
        </Tag>
      </Descriptions.Item>

      <Descriptions.Item label="Total Size">
        {brief?.storeSize}
      </Descriptions.Item>

      <Descriptions.Item label="Primary Size">
        {brief?.priStoreSize}
      </Descriptions.Item>

      <Descriptions.Item label="Status">{brief?.status}</Descriptions.Item>

      <Descriptions.Item label="Primary Shards">{brief?.pri}</Descriptions.Item>

      <Descriptions.Item label="Replica Shards">{brief?.rep}</Descriptions.Item>

      <Descriptions.Item label="Uuid">{brief?.uuid}</Descriptions.Item>
    </Descriptions>
  );
}
